/**
 * Robust SMS Parser for Bank Transactions
 */

export interface ParsedSMS {
  type: 'income' | 'expense';
  amount: number;
  merchant: string;
  date: string;
  status: 'review' | 'verified';
  source: 'sms';
  confidence: 'high' | 'medium' | 'low';
  rawSMS?: string;
  senderId?: string;
}

export const normalizeSMS = (text: string) => {
  return text
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

export const detectType = (text: string): { type: 'income' | 'expense' | null; confidence: number } => {
  const expenseSignals = [
    'debited', 'spent', 'paid', 'withdrawn', 'sent', 'purchase', 'dr', 
    'payment to', 'transfer to', 'withdraw', 'spent on', 'ref no'
  ];
  const incomeSignals = [
    'credited', 'received', 'salary', 'cashback', 'refund', 'deposit', 'cr',
    'received from', 'added to', 'refunded'
  ];

  let expenseMatches = 0;
  let incomeMatches = 0;

  expenseSignals.forEach(signal => {
    if (text.includes(signal)) expenseMatches++;
  });

  incomeSignals.forEach(signal => {
    if (text.includes(signal)) incomeMatches++;
  });

  // Calculate local confidence based on signals
  if (expenseMatches > incomeMatches) {
    return { type: 'expense', confidence: expenseMatches > 1 ? 0.9 : 0.7 };
  } else if (incomeMatches > expenseMatches) {
    return { type: 'income', confidence: incomeMatches > 1 ? 0.9 : 0.7 };
  }

  return { type: null, confidence: 0 };
};

export const extractAmount = (text: string) => {
  // Support formats: Rs.120.00, Rs 999, ₹500, INR 1200
  const match = text.match(/(?:rs\.?|₹|inr)\s?([\d,]+\.?\d*)/i);
  return match ? parseFloat(match[1].replace(/,/g, "")) : null;
};

export const extractDate = (text: string) => {
  // Support formats: 18-04-26, 19/04/26
  const match = text.match(/\b(\d{2}[-\/]\d{2}[-\/]\d{2,4})\b/);
  return match ? match[1] : new Date().toLocaleDateString('en-GB');
};

export const extractMerchant = (text: string) => {
  // Rules: Extract ONLY after "to", "from", or "vpa"
  // Do NOT guess brand names from random words
  let match =
    text.match(/vpa\s([a-z0-9@._]+)/i) ||
    text.match(/to\s([a-z0-9@._]+)/i) ||
    text.match(/from\s([a-z0-9@._]+)/i);

  if (match) {
    const merchant = match[1];
    // Clean UPI noise if it's just a handle
    if (merchant.includes('@')) {
      return merchant; // Keep full VPA for now as per instruction
    }
    return merchant;
  }

  return null;
};

export const parseSMS = (rawText: string, sender: string = ''): ParsedSMS | { error: true; message: string } => {
  const text = normalizeSMS(rawText);

  // 1. HARD VALIDATION LAYER
  const validation = validateFinancialSMS(text, sender);
  if (validation.confidence === 'low') {
    return {
      error: true,
      message: validation.reason || "Not a valid bank transaction SMS"
    };
  }

  const detection = detectType(text);
  const type = detection.type;
  const amount = extractAmount(text);
  const date = extractDate(text);
  const merchant = extractMerchant(text);

  if (!amount) {
    return {
      error: true,
      message: "Amount not detected"
    };
  }

  // Force review if type is null or confidence is low
  const needsReview = !type || !merchant || detection.confidence < 0.8;
  const status = needsReview ? 'review' : 'verified';
  
  // High-quality fallback naming
  const fallbackName = type === 'income' ? 'Bank Transfer' : 'UPI Payment';

  return {
    type: type || 'expense',
    amount,
    merchant: merchant || fallbackName,
    date,
    status,
    source: 'sms',
    confidence: detection.confidence < 0.8 ? 'medium' : 'high',
    rawSMS: rawText,
    senderId: sender
  };
};

/**
 * Hard Validation Layer
 */
export const validateFinancialSMS = (text: string, sender: string = ''): { confidence: 'high' | 'medium' | 'low'; reason?: string } => {
  const normalizedText = text.toLowerCase();
  const normalizedSender = sender.toLowerCase();

  // 0. EXCLUSION PATTERNS (CRITICAL)
  const isMarketing = normalizedText.includes('offer') || 
                      normalizedText.includes('limited time') || 
                      normalizedText.includes('exclusive');
  const isOTP = normalizedText.includes('otp') || normalizedText.includes('verification code');
  
  if (isMarketing || isOTP) {
    return { confidence: 'low', reason: "Rejected: Marketing or OTP content" };
  }

  // Potential signal (not necessarily a definitive transaction)
  const isReminder = normalizedText.includes('due') || 
                      normalizedText.includes('outstanding') || 
                      normalizedText.includes('statement generated');

  // 1. AMOUNT CHECK
  const hasAmountSymbol = normalizedText.includes('rs') || normalizedText.includes('₹');
  if (!hasAmountSymbol) return { confidence: 'low', reason: "Rejected: No amount detected" };

  // 2. KEYWORD CHECK
  const keywords = ['credited', 'debited', 'sent', 'received', 'paid', 'purchase', 'spent', 'charged'];
  const hasKeyword = keywords.some(k => normalizedText.includes(k));
  
  if (!hasKeyword && isReminder) {
    return { confidence: 'low', reason: "Financial signal: Informational alert, not a transaction" };
  }

  if (!hasKeyword) return { confidence: 'low', reason: "Rejected: No transaction keywords" };

  // 3. ACCOUNT REFERENCE CHECK
  const accountRefs = ['a/c', 'upi', 'ref', 'account', 'vpa', 'card'];
  const hasAccountRef = accountRefs.some(r => normalizedText.includes(r));
  if (!hasAccountRef) return { confidence: 'low', reason: "Rejected: No bank/account reference" };

  // 4. SENDER PATTERN CHECK
  const bankPatterns = ['hdfc', 'sbi', 'axis', 'icici', 'fede', 'idfc', 'kotk', 'rbl'];
  const prefixPatterns = ['vm-', 'vk-', 'ax-', 'bk-', 'bz-'];
  
  const isBankSender = bankPatterns.some(p => normalizedSender.includes(p));
  const isStandardPrefix = prefixPatterns.some(p => normalizedSender.startsWith(p));

  // TASK 5: Consistency Check (Sender vs Content)
  if (isBankSender) {
    const senderBank = bankPatterns.find(p => normalizedSender.includes(p));
    if (senderBank) {
      const otherBanks = bankPatterns.filter(p => p !== senderBank);
      const mentionedOtherBank = otherBanks.find(b => normalizedText.includes(b));
      const mentionsSenderBank = normalizedText.includes(senderBank);
      
      if (mentionedOtherBank && !mentionsSenderBank) {
        return { confidence: 'low', reason: `Rejected: Bank mismatch (Sender: ${senderBank}, Content mentions: ${mentionedOtherBank})` };
      }
    }
  }

  if (!isBankSender && !isStandardPrefix) {
    return { confidence: 'medium', reason: "Medium: Non-standard bank sender, risky" };
  }

  return { confidence: 'high' };
};

/**
 * Task 1: Generate Transaction Fingerprint
 * amount | date | merchant | last4 (optional)
 */
export const generateFingerprint = (data: {
  amount: number;
  date: string;
  merchant: string;
  senderId?: string;
  rawSMS?: string;
}) => {
  const { amount, date, merchant, senderId, rawSMS } = data;
  
  // Extract account/ref if available from rawSMS
  let ref = 'none';
  if (rawSMS) {
    const accMatch = rawSMS.match(/a\/c\s*x*(\d{3,4})/i) || rawSMS.match(/xx(\d{3,4})/i);
    if (accMatch) ref = accMatch[1];
  } else if (senderId) {
    ref = senderId.slice(-4);
  }

  const cleanMerchant = merchant.toLowerCase().trim().replace(/\s+/g, "");
  return `${amount.toFixed(2)}|${date}|${cleanMerchant}|${ref}`;
};

/**
 * Filter for financial messages only (Legacy - now uses validateFinancialSMS)
 */
export const isFinancialSMS = (text: string, sender: string = ''): boolean => {
  return validateFinancialSMS(text, sender).confidence !== 'low';
};
