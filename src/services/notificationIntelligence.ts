import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, setDoc, updateDoc, deleteDoc, getDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { normalizeSMS, detectType, extractAmount, extractDate, extractMerchant, validateFinancialSMS } from '../lib/smsParser';
import { categorizeTransaction } from '../lib/categorizationEngine';
import { fetchUserMappings, learnMerchantCategory } from './intelligenceMemory';

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
  isLearned?: boolean;
}

export type NotificationClass = 
  | 'transaction' 
  | 'bill_due' 
  | 'subscription' 
  | 'salary' 
  | 'reward' 
  | 'marketing' 
  | 'financial_info' 
  | 'system_alert' 
  | 'unknown';

export type ParseStatus = 'SUCCESS' | 'FILTERED' | 'DUPLICATE_IGNORED' | 'LOW_CONFIDENCE' | 'PARSE_FAILED' | 'ERROR' | 'SIGNAL_CAPTURED';

export interface ParseResult {
  success: boolean;
  status: ParseStatus;
  stage: 'capture' | 'filter' | 'parse' | 'normalize' | 'confidence' | 'dedupe' | 'save';
  data?: Partial<DetectedTransaction>;
  class?: NotificationClass;
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
 * Layer 1.5: Classify the notification type to determine if it's a transaction or other financial signal
 */
export const classifyNotification = (text: string, appName: string): NotificationClass => {
  const t = text.toLowerCase();
  const app = appName.toLowerCase();

  // 1. Transactional patterns (Highest priority)
  if (
    (t.includes('credited') || t.includes('debited') || t.includes('sent') || t.includes('received') || t.includes('paid') || t.includes('spent') || t.includes('purchase') || t.includes('charged')) &&
    (t.includes('rs') || t.includes('₹'))
  ) {
    if (t.includes('salary')) return 'salary';
    if (t.includes('recurring') || t.includes('subscription')) return 'subscription';
    return 'transaction';
  }

  // 2. Bill Due patterns
  if (t.includes('due') || t.includes('bill payable') || t.includes('statement generated') || t.includes('outstanding')) {
    return 'bill_due';
  }

  // 3. Rewards / Marketing
  if (t.includes('reward') || t.includes('cashback') || t.includes('points') || t.includes('won')) {
    return 'reward';
  }

  if (t.includes('offer') || t.includes('loan') || t.includes('limit') || t.includes('exclusive')) {
    return 'marketing';
  }

  // 4. Financial Status / Info
  if (t.includes('balance') || t.includes('otp') || t.includes('verification') || t.includes('login')) {
    return 'financial_info';
  }

  // 5. System alerts
  if (t.includes('security') || t.includes('blocked') || t.includes('temporary')) {
    return 'system_alert';
  }

  return 'unknown';
};

/**
 * Layer 2: Filter financial notifications
 */
export const isFinancialNotification = (notification: RawNotification): { 
  isFinancial: boolean; 
  class: NotificationClass;
  reason?: string; 
  status?: ParseStatus;
} => {
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
      class: 'unknown',
      reason: "Non-financial source: WealthOS ignores non-banking apps for security.",
      status: 'FILTERED'
    };
  }

  // 3. Classify Notification
  const category = classifyNotification(text, notification.app);

  // 4. Determine if we should process as transaction
  const validation = validateFinancialSMS(text, notification.app);
  
  if (category === 'transaction' || category === 'salary' || category === 'subscription') {
     // UPI apps are more trusted for "Transaction" keywords even if bank reference is missing
    if (provider?.type === 'upi' && extractAmount(text)) {
      return { isFinancial: true, class: category };
    }

    if (validation.confidence === 'low') {
      return { 
        isFinancial: false, 
        class: category,
        reason: "Financial alert detected, but no payment details found to track.",
        status: 'FILTERED'
      };
    }
    return { isFinancial: true, class: category };
  }

  // If it's another financial signal (like bill due), we mark it as financial but NOT a transaction for the current queue
  // In the future we will route these to specialized handlers
  return { 
    isFinancial: false, 
    class: category,
    reason: category === 'unknown' 
      ? "Unknown financial signal: Capturing patterns for system improvement." 
      : `WealthOS identified this as a ${category.replace('_', ' ')}. No transaction to record.`,
    status: 'SIGNAL_CAPTURED'
  };
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
    // 1. Filter & Classify
    const filterDetails = isFinancialNotification(notification);
    logs.push(`[Filter] Intelligence Class: ${filterDetails.class}`);

    if (!filterDetails.isFinancial) {
      logs.push(`[Filter] Outcome: ${filterDetails.reason}`);
      return { 
        success: false, 
        status: filterDetails.status || 'FILTERED', 
        stage: 'filter', 
        class: filterDetails.class,
        error: filterDetails.reason, 
        logs 
      };
    }
    logs.push(`[Filter] Proceeding with transaction parsing`);

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
    const userMappings = await fetchUserMappings();
    const catResult = categorizeTransaction(merchant || combinedText, userMappings);
    
    // Adaptive Confidence: Boost confidence if it's a learned pattern
    let confidence = validation.confidence;
    let isMatchedViaMemory = false;
    if (catResult.confidence === 1.0) {
      confidence = 'high';
      isMatchedViaMemory = true;
      logs.push(`[Intelligence] Learned pattern matched: ${catResult.category}`);
    }

    logs.push(`[Parse] Extracted: Type=${type || 'expense'}, Amount=${amount}, Merchant=${merchant}`);
    logs.push(`[Parse] Categorized: ${catResult.category} (${(catResult.confidence * 100).toFixed(0)}% confidence)`);

    // 3. Normalize
    const parsed: Partial<DetectedTransaction> = {
      type: type || 'expense',
      amount,
      merchant: merchant,
      category: catResult.category,
      date: date || new Date().toLocaleDateString('en-GB'),
      confidence: confidence,
      app: notification.app,
      rawBody: notification.body,
      status: 'pending',
      isLearned: isMatchedViaMemory
    };
    logs.push(`[Normalize] Data stabilized for user ${auth.currentUser.uid}`);

    // 4. Fingerprint & Dedupe
    const cleanMerchant = parsed.merchant?.toLowerCase().trim().replace(/\s+/g, "") || 'unknown';
    // Strong fingerprint: amount + merchant + date (ignoring app to handle cross-app redundancy)
    const fingerprint = `${parsed.amount?.toFixed(2)}|${parsed.date}|${cleanMerchant}`;
    logs.push(`[Dedupe] Generated strong fingerprint: ${fingerprint}`);

    const pendingTxRef = collection(db, `users/${auth.currentUser.uid}/detected_transactions`);
    
    // Check for exact fingerprint matches first
    const qFp = query(pendingTxRef, where('fingerprint', '==', fingerprint));
    const existingFp = await getDocs(qFp);

    if (!existingFp.empty) {
      logs.push(`[Dedupe] Found existing transaction with same fingerprint`);
      return { 
        success: true,
        status: 'DUPLICATE_IGNORED', 
        stage: 'dedupe', 
        error: 'Duplicate transaction (Fingerprint Match)', 
        logs 
      };
    }

    // Secondary Dedupe: Time + Amount + Merchant (Handling race conditions or slightly different date strings)
    // We check if a similar transaction was processed in the last 10 minutes
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    const qSimilar = query(
      pendingTxRef, 
      where('amount', '==', parsed.amount),
      where('detectedAt', '>=', tenMinsAgo)
    );
    const similarDocs = await getDocs(qSimilar);
    const isSimilar = similarDocs.docs.some(d => {
      const data = d.data();
      return data.merchant?.toLowerCase().trim() === parsed.merchant?.toLowerCase().trim();
    });

    if (isSimilar) {
      logs.push(`[Dedupe] Found similar transaction within 10-minute window. Safer to skip.`);
      return { 
        success: true,
        status: 'DUPLICATE_IGNORED', 
        stage: 'dedupe', 
        error: 'Duplicate transaction (Time Window Match)', 
        logs 
      };
    }

    // 5. Automation Strategy
    let finalStatus: 'pending' | 'approved' = 'pending';
    const isAutoApprovable = isMatchedViaMemory && confidence === 'high';
    
    if (isAutoApprovable) {
      finalStatus = 'approved';
      logs.push(`[Automation] TRUST LEVEL 3: Auto-approving high-confidence learned pattern.`);
    }

    // 6. Save
    const txData = {
      ...parsed,
      status: finalStatus,
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

      // If auto-approved, we also need to add it to the main transactions collection
      if (finalStatus === 'approved') {
        const mainTxRef = collection(db, `users/${auth.currentUser.uid}/transactions`);
        await addDoc(mainTxRef, {
          ...parsed,
          userId: auth.currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          source: 'auto-automation',
          detectedTransactionId: docRef.id // Relate them for undo
        });
        logs.push(`[Automation] Transaction synced to ledger.`);
      }

      return { 
        success: true, 
        status: finalStatus === 'approved' ? 'SUCCESS' : 'SUCCESS', // Could refine status for UI
        stage: 'save', 
        data: { ...parsed, id: docRef.id, status: finalStatus } as DetectedTransaction, 
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

    // 2. Intelligence Learning: Save preferences if merchant/category is set
    if (finalData.merchant && finalData.category) {
      await learnMerchantCategory(finalData.merchant, finalData.category);
    }

    // 3. Add to main transactions
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

/**
 * Revert an approved transaction back to pending or delete it from ledger
 */
export const revertTransaction = async (txId: string) => {
  if (!auth.currentUser) return;
  try {
    const uid = auth.currentUser.uid;
    const txRef = doc(db, `users/${uid}/detected_transactions`, txId);
    
    // 1. Fetch detected transaction to find the ledger link
    const snap = await getDoc(txRef);
    if (!snap.exists()) return;
    const data = snap.data();
    
    // 2. Remove from ledger if it was synced
    const mainTxQuery = query(
      collection(db, `users/${uid}/transactions`),
      where('detectedTransactionId', '==', txId)
    );
    const mainTxSnap = await getDocs(mainTxQuery);
    for (const d of mainTxSnap.docs) {
      await deleteDoc(d.ref);
    }
    
    // 3. Set status back to pending
    await updateDoc(txRef, { 
      status: 'pending',
      revertedAt: serverTimestamp()
    });
    
    console.log(`WealthOS Reality: Reverted transaction ${txId}`);
  } catch (error) {
    console.error('WealthOS: Failed to revert transaction', error);
  }
};
