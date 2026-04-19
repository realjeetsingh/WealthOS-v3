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
}

export const normalizeSMS = (text: string) => {
  return text
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

export const detectType = (text: string) => {
  if (text.includes("credited") || text.includes("received")) {
    return "income";
  }

  if (
    text.includes("debited") ||
    text.includes("sent") ||
    text.includes("paid")
  ) {
    return "expense";
  }

  return null;
};

export const extractAmount = (text: string) => {
  // Support formats: Rs.120.00, Rs 999, ₹500
  const match = text.match(/(?:rs\.?|₹)\s?([\d,]+\.?\d*)/i);
  return match ? parseFloat(match[1].replace(/,/g, "")) : null;
};

export const extractDate = (text: string) => {
  // Support formats: 18-04-26, 19/04/26
  const match = text.match(/\b(\d{2}[-\/]\d{2}[-\/]\d{2,4})\b/);
  return match ? match[1] : new Date().toLocaleDateString('en-GB');
};

export const extractMerchant = (text: string) => {
  // Rules: Extract after "to", "from", or "vpa"
  // Prioritize VPA for more accurate UPI detection
  let match =
    text.match(/vpa\s([a-z0-9@._]+)/i) ||
    text.match(/to\s([a-z0-9@._]+)/i) ||
    text.match(/from\s([a-z0-9@._]+)/i);

  return match ? match[1] : null;
};

export const parseSMS = (rawText: string): ParsedSMS | { error: true; message: string } => {
  const text = normalizeSMS(rawText);

  const type = detectType(text);
  const amount = extractAmount(text);
  const date = extractDate(text);
  const merchant = extractMerchant(text);

  if (!amount) {
    return {
      error: true,
      message: "Amount not detected"
    };
  }

  const status = (!type || !merchant) ? 'review' : 'verified';
  
  // High-quality fallback naming
  const fallbackName = type === 'income' ? 'Bank Transfer' : 'UPI Payment';

  return {
    type: type || 'expense',
    amount,
    merchant: merchant || fallbackName,
    date,
    status,
    source: 'sms'
  };
};

/**
 * Filter for financial messages only
 */
export const isFinancialSMS = (text: string, sender: string = ''): boolean => {
  const normalizedText = text.toLowerCase();
  const normalizedSender = sender.toLowerCase();

  // Exclusion patterns
  const isOTP = normalizedText.includes('otp') || normalizedText.includes('verification code');
  const isPromo = normalizedText.includes('limited time') || normalizedText.includes('offer');
  const isRecharge = normalizedText.includes('recharge') || normalizedText.includes('validity');
  
  if (isOTP || isPromo || isRecharge) return false;

  // Inclusion patterns
  const hasKeywords = [
    'credited', 'debited', 'sent', 'upi', 'txn', 'a/c', 'bank'
  ].some(k => normalizedText.includes(k));

  const hasSenderPattern = [
    'hdfc', 'sbi', 'axis', 'icici', 'vm-', 'vk-', 'ax-', 'bk-'
  ].some(s => normalizedSender.includes(s));

  return hasKeywords || hasSenderPattern;
};
