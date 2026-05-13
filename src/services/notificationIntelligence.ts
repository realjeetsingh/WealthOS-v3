import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, setDoc, updateDoc, deleteDoc, getDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { normalizeSMS, detectType, extractAmount, extractDate, extractMerchant, validateFinancialSMS } from '../lib/smsParser';
import { categorizeTransaction } from '../lib/categorizationEngine';

export interface RawNotification {
  id: string;
  app: string; // e.g., 'Google Pay', 'HDFC Bank', 'PhonePe'
  title: string;
  body: string;
  timestamp: Date;
  packageName?: string;
}

export interface DetectedTransaction {
  id: string;
  userId: string;
  type: 'income' | 'expense';
  amount: number;
  merchant: string;
  category?: string;
  date: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'notification';
  app: string;
  rawBody: string;
  status: 'pending' | 'approved' | 'ignored';
  detectedAt: Date;
  fingerprint: string;
}

export type ParseStatus = 'SUCCESS' | 'FILTERED' | 'DUPLICATE_IGNORED' | 'LOW_CONFIDENCE' | 'PARSE_FAILED' | 'ERROR';

export interface ParseResult {
  success: boolean;
  status: ParseStatus;
  stage: 'capture' | 'filter' | 'parse' | 'normalize' | 'confidence' | 'dedupe' | 'save';
  data?: Partial<DetectedTransaction>;
  error?: string;
  logs: string[];
}

/**
 * Intelligent Transaction Detection Engine
 */

/**
 * Canonical Financial Provider Registry
 */
interface FinancialProvider {
  name: string;
  aliases: string[];
  packages: string[];
  type: 'bank' | 'upi' | 'wallet' | 'fintech';
}

const TRUSTED_PROVIDERS: FinancialProvider[] = [
  {
    name: 'Google Pay',
    aliases: ['gpay', 'google pay'],
    packages: ['com.google.android.apps.nbu.paisa.user'],
    type: 'upi'
  },
  {
    name: 'PhonePe',
    aliases: ['phonepe'],
    packages: ['com.phonepe.app'],
    type: 'upi'
  },
  {
    name: 'Paytm',
    aliases: ['paytm'],
    packages: ['net.one97.paytm'],
    type: 'upi'
  },
  {
    name: 'BHIM',
    aliases: ['bhim'],
    packages: ['in.org.npci.upiapp'],
    type: 'upi'
  },
  {
    name: 'Amazon Pay',
    aliases: ['amazon.pay', 'amazon pay'],
    packages: ['com.amazon.mShop.android.shopping'],
    type: 'upi'
  },
  {
    name: 'CRED',
    aliases: ['cred'],
    packages: ['com.dreamplug.android.cred'],
    type: 'fintech'
  }
];

const SECONDARY_FINANCIAL_KEYS = [
  'hdfc', 'icici', 'sbi', 'kotak', 'axis', 'pnb', 'bob', 'canara', 'rbl', 'yesbank', 'indusind',
  'slice', 'fampay', 'jupiter', 'fi.money', 'niyo', 'scopia', 'mobikwik'
];

/**
 * Layer 2: Filter financial notifications
 */
export const isFinancialNotification = (notification: RawNotification): { isFinancial: boolean; reason?: string; status?: ParseStatus } => {
  const text = (notification.title + ' ' + notification.body).toLowerCase();
  const appName = notification.app.toLowerCase();
  const packageName = (notification.packageName || '').toLowerCase();

  // 1. Check Primary Trusted Registry
  const provider = TRUSTED_PROVIDERS.find(p => 
    p.packages.some(pkg => packageName.includes(pkg)) ||
    p.aliases.some(alias => appName.includes(alias))
  );

  // 2. Check Secondary Keyword Match
  const isSecondaryMatch = SECONDARY_FINANCIAL_KEYS.some(key => 
    appName.includes(key) || packageName.includes(key)
  );

  if (!provider && !isSecondaryMatch) {
    return { 
      isFinancial: false, 
      reason: "Notification safely ignored: Not from a recognized financial application.",
      status: 'FILTERED'
    };
  }

  const validation = validateFinancialSMS(text, notification.app);
  
  // UPI apps are more trusted for "Transaction" keywords even if bank reference is missing
  if (provider?.type === 'upi' && extractAmount(text)) {
    return { isFinancial: true };
  }

  if (validation.confidence === 'low') {
    return { 
      isFinancial: false, 
      reason: isSecondaryMatch || provider 
        ? "Financial provider detected, but no transaction details found in notification."
        : "Notification safely ignored: No transaction patterns detected.",
      status: 'FILTERED'
    };
  }

  return { isFinancial: true };
};

/**
 * Main Entry Point: Process Incoming Notification with structured pipeline
 */
export const processIncomingNotification = async (notification: RawNotification): Promise<ParseResult> => {
  const logs: string[] = [];
  logs.push(`[Capture] Received notification from ${notification.app}`);

  if (!auth.currentUser) {
    return { success: false, status: 'ERROR', stage: 'capture', error: 'User not authenticated', logs };
  }

  try {
    // 1. Filter
    const filterDetails = isFinancialNotification(notification);
    if (!filterDetails.isFinancial) {
      logs.push(`[Filter] Rejected: ${filterDetails.reason}`);
      return { 
        success: false, 
        status: filterDetails.status || 'FILTERED', 
        stage: 'filter', 
        error: filterDetails.reason, 
        logs 
      };
    }
    logs.push(`[Filter] Trusted financial source identified`);

    // 2. Parse
    const combinedText = notification.title + ' ' + notification.body;
    const normalized = normalizeSMS(combinedText);
    
    const type = detectType(normalized);
    const amount = extractAmount(normalized);
    let merchant = extractMerchant(normalized);
    const date = extractDate(normalized);
    const validation = validateFinancialSMS(normalized, notification.app);

    if (!amount) {
      logs.push(`[Parse] Failed to extract amount from: "${normalized}"`);
      return { success: false, status: 'PARSE_FAILED', stage: 'parse', error: 'Could not detect transaction amount', logs };
    }

    // Salary/Income Merchant Refinement
    if (type === 'income' && !merchant) {
      if (normalized.includes('salary') || normalized.includes('credited by salary')) {
        merchant = 'Salary Credit';
      } else {
        merchant = 'Received Payment';
      }
    } else if (!merchant) {
      merchant = 'Paid Merchant';
    }
    
    // Categorization Logic
    const catResult = categorizeTransaction(merchant || combinedText);
    logs.push(`[Parse] Extracted: Type=${type || 'expense'}, Amount=${amount}, Merchant=${merchant}`);
    logs.push(`[Parse] Categorized: ${catResult.category} (${(catResult.confidence * 100).toFixed(0)}% confidence)`);

    // 3. Normalize
    const parsed: Partial<DetectedTransaction> = {
      type: type || 'expense',
      amount,
      merchant: merchant,
      category: catResult.category,
      date: date || new Date().toLocaleDateString('en-GB'),
      confidence: validation.confidence,
      app: notification.app,
      rawBody: notification.body,
      status: 'pending'
    };
    logs.push(`[Normalize] Data stabilized for user ${auth.currentUser.uid}`);

    // 4. Fingerprint & Dedupe
    const cleanMerchant = parsed.merchant?.toLowerCase().trim().replace(/\s+/g, "") || 'unknown';
    const fingerprint = `${parsed.amount?.toFixed(2)}|${parsed.date}|${cleanMerchant}|${parsed.app?.toLowerCase()}`;
    logs.push(`[Dedupe] Generated fingerprint: ${fingerprint}`);

    const pendingTxRef = collection(db, `users/${auth.currentUser.uid}/detected_transactions`);
    const q = query(pendingTxRef, where('fingerprint', '==', fingerprint));
    const existing = await getDocs(q);

    if (!existing.empty) {
      logs.push(`[Dedupe] Found existing transaction with same fingerprint`);
      return { 
        success: true, // We return success: true because it's not an "error" that it worked twice
        status: 'DUPLICATE_IGNORED', 
        stage: 'dedupe', 
        error: 'Transaction already tracked', 
        logs 
      };
    }

    // 5. Save
    const txData = {
      ...parsed,
      userId: auth.currentUser.uid,
      fingerprint,
      detectedAt: serverTimestamp(),
      source: 'notification'
    };

    const path = `users/${auth.currentUser.uid}/detected_transactions`;
    logs.push(`[Save] Attempting write to: ${path}`);
    logs.push(`[Save] Payload Summary: ${parsed.merchant} | ₹${parsed.amount} | ${parsed.type}`);
    logs.push(`[Save] Full Payload: ${JSON.stringify({ ...txData, detectedAt: 'SERVER_TIMESTAMP' })}`);

    try {
      const docRef = await addDoc(pendingTxRef, txData);
      logs.push(`[Save] Success! Document ID: ${docRef.id}`);

      return { 
        success: true, 
        status: 'SUCCESS',
        stage: 'save', 
        data: { ...parsed, id: docRef.id } as DetectedTransaction, 
        logs 
      };
    } catch (saveError: any) {
      const errorMsg = saveError instanceof Error ? saveError.message : String(saveError);
      logs.push(`[Critical] Firestore Error: ${errorMsg}`);
      return { success: false, status: 'ERROR', stage: 'save', error: errorMsg, logs };
    }

  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logs.push(`[Critical] Runtime: ${errorMsg}`);
    return { success: false, status: 'ERROR', stage: 'save', error: errorMsg, logs };
  }
};

/**
 * Approval Actions
 */
export const approveTransaction = async (txId: string, finalData: any) => {
  if (!auth.currentUser) return;
  try {
    // 1. Mark as approved
    const txRef = doc(db, `users/${auth.currentUser.uid}/detected_transactions`, txId);
    await updateDoc(txRef, { status: 'approved' });

    // 2. Add to main transactions
    await addDoc(collection(db, `users/${auth.currentUser.uid}/transactions`), {
      ...finalData,
      userId: auth.currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      source: 'auto-notification'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${auth.currentUser?.uid}/transactions`);
  }
};

export const ignoreTransaction = async (txId: string) => {
  if (!auth.currentUser) return;
  try {
    const txRef = doc(db, `users/${auth.currentUser.uid}/detected_transactions`, txId);
    await updateDoc(txRef, { status: 'ignored' });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${auth.currentUser.uid}/detected_transactions`);
  }
};

export const deleteDetectedTransaction = async (txId: string) => {
  if (!auth.currentUser) return;
  try {
    await deleteDoc(doc(db, `users/${auth.currentUser.uid}/detected_transactions`, txId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${auth.currentUser.uid}/detected_transactions`);
  }
};
