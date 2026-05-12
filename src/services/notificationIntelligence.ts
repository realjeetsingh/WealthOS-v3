import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, setDoc, updateDoc, deleteDoc, getDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { normalizeSMS, detectType, extractAmount, extractDate, extractMerchant, validateFinancialSMS } from '../lib/smsParser';

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
  date: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'notification';
  app: string;
  rawBody: string;
  status: 'pending' | 'approved' | 'ignored';
  detectedAt: Date;
  fingerprint: string;
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
export const isFinancialNotification = (notification: RawNotification): boolean => {
  const text = (notification.title + ' ' + notification.body).toLowerCase();
  const isFromFinApp = financialApps.some(app => 
    notification.app.toLowerCase().includes(app) || 
    (notification.packageName && notification.packageName.toLowerCase().includes(app))
  );

  if (!isFromFinApp) return false;

  // Reuse SMS validation logic for content checks
  return validateFinancialSMS(text, notification.app).confidence !== 'low';
};

/**
 * Layer 3 & 4: Parser & Confidence Engine
 */
export const parseNotification = (notification: RawNotification): Partial<DetectedTransaction> | null => {
  const combinedText = notification.title + ' ' + notification.body;
  const normalized = normalizeSMS(combinedText);
  
  const type = detectType(normalized);
  const amount = extractAmount(normalized);
  const merchant = extractMerchant(normalized);
  const date = extractDate(normalized);
  const validation = validateFinancialSMS(normalized, notification.app);

  if (!amount) return null;

  return {
    type: type || 'expense',
    amount,
    merchant: merchant || (type === 'income' ? 'Received Payment' : 'Paid Merchant'),
    date: date,
    confidence: validation.confidence,
    app: notification.app,
    rawBody: notification.body,
    status: 'pending'
  };
};

/**
 * Layer 5: Deduplication
 */
export const generateNotificationFingerprint = (tx: Partial<DetectedTransaction>) => {
  const cleanMerchant = tx.merchant?.toLowerCase().trim().replace(/\s+/g, "") || 'unknown';
  return `${tx.amount?.toFixed(2)}|${tx.date}|${cleanMerchant}|${tx.app?.toLowerCase()}`;
};

/**
 * Main Entry Point: Process Incoming Notification
 */
export const processIncomingNotification = async (notification: RawNotification) => {
  if (!auth.currentUser) return;

  // 1. Filter
  if (!isFinancialNotification(notification)) return;

  // 2. Parse
  const parsed = parseNotification(notification);
  if (!parsed) return;

  const fingerprint = generateNotificationFingerprint(parsed);

  // 3. Deduplicate (Check Firestore)
  const pendingTxRef = collection(db, `users/${auth.currentUser.uid}/detected_transactions`);
  const q = query(
    pendingTxRef, 
    where('fingerprint', '==', fingerprint)
  );

  const existing = await getDocs(q);
  if (!existing.empty) {
    console.log('[Intelligence] Duplicate detected, skipping.');
    return;
  }

  // 4. Save to Pending Queue
  const txData = {
    ...parsed,
    userId: auth.currentUser.uid,
    fingerprint,
    detectedAt: serverTimestamp(),
    status: 'pending',
    source: 'notification'
  };

  try {
    await addDoc(pendingTxRef, txData);
    console.log('[Intelligence] New transaction detected and queued for approval.');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${auth.currentUser.uid}/detected_transactions`);
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
