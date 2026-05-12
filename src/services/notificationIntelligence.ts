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

export interface ParseResult {
  success: boolean;
  stage: 'capture' | 'filter' | 'parse' | 'normalize' | 'confidence' | 'dedupe' | 'save';
  data?: Partial<DetectedTransaction>;
  error?: string;
  logs: string[];
}

/**
 * Intelligent Transaction Detection Engine
 */
export const financialApps = [
  'hdfc', 'sbi', 'axis', 'icici', 'fede', 'idfc', 'kotk', 'rbl',
  'paytm', 'phonepe', 'google pay', 'gpay', 'mobikwik', 'cred'
];

/**
 * Layer 2: Filter financial notifications
 */
export const isFinancialNotification = (notification: RawNotification): { isFinancial: boolean; reason?: string } => {
  const text = (notification.title + ' ' + notification.body).toLowerCase();
  
  const isFromFinApp = financialApps.some(app => 
    notification.app.toLowerCase().includes(app) || 
    (notification.packageName && notification.packageName.toLowerCase().includes(app))
  );

  if (!isFromFinApp) {
    return { isFinancial: false, reason: `App '${notification.app}' is not in financial allow-list.` };
  }

  const validation = validateFinancialSMS(text, notification.app);
  if (validation.confidence === 'low') {
    return { isFinancial: false, reason: validation.reason || "Content did not match financial patterns." };
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
    return { success: false, stage: 'capture', error: 'User not authenticated', logs };
  }

  try {
    // 1. Filter
    const filterResult = isFinancialNotification(notification);
    if (!filterResult.isFinancial) {
      logs.push(`[Filter] Rejected: ${filterResult.reason}`);
      return { success: false, stage: 'filter', error: filterResult.reason, logs };
    }
    logs.push(`[Filter] Passed financial check`);

    // 2. Parse
    const combinedText = notification.title + ' ' + notification.body;
    const normalized = normalizeSMS(combinedText);
    
    const type = detectType(normalized);
    const amount = extractAmount(normalized);
    const merchant = extractMerchant(normalized);
    const date = extractDate(normalized);
    const validation = validateFinancialSMS(normalized, notification.app);

    if (!amount) {
      logs.push(`[Parse] Failed to extract amount from: "${normalized}"`);
      return { success: false, stage: 'parse', error: 'Could not detect transaction amount', logs };
    }
    
    // Categorization Logic
    const catResult = categorizeTransaction(merchant || combinedText);
    logs.push(`[Parse] Extracted: Type=${type || 'expense'}, Amount=${amount}, Merchant=${merchant || 'Unknown'}`);
    logs.push(`[Parse] Categorized: ${catResult.category} (${(catResult.confidence * 100).toFixed(0)}% confidence)`);

    // 3. Normalize
    const parsed: Partial<DetectedTransaction> = {
      type: type || 'expense',
      amount,
      merchant: merchant || (type === 'income' ? 'Received Payment' : 'Paid Merchant'),
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
      return { success: false, stage: 'dedupe', error: 'Duplicate transaction detected', logs };
    }

    // 5. Save
    const txData = {
      ...parsed,
      userId: auth.currentUser.uid,
      fingerprint,
      detectedAt: serverTimestamp(),
      source: 'notification'
    };

    const docRef = await addDoc(pendingTxRef, txData);
    logs.push(`[Save] Success! Document ID: ${docRef.id}`);

    return { 
      success: true, 
      stage: 'save', 
      data: { ...parsed, id: docRef.id } as DetectedTransaction, 
      logs 
    };

  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logs.push(`[Critical] ${errorMsg}`);
    return { success: false, stage: 'save', error: errorMsg, logs };
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
