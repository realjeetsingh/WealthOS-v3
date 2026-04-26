import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc,
  deleteDoc,
  doc,
  query, 
  where,
  orderBy, 
  serverTimestamp,
  getDoc,
  writeBatch,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Budget, Transaction, Asset, Liability, Loan } from '../types';
import { updateFinancialSnapshot } from './snapshotService';
import { categorizeTransaction, CATEGORIES } from '../lib/categorizationEngine';
import { getUserCategoryMappings, updateUserCategoryMapping } from './categorizationService';
import { generateFingerprint } from '../lib/smsParser';

/**
 * Budgets
 */
export const addBudget = async (userId: string | undefined, data: Omit<Budget, 'id' | 'timestamp'>) => {
  if (!userId) throw new Error('User ID is required for addBudget');
  const path = `users/${userId}/budgets`;
  try {
    const docRef = await addDoc(collection(db, path), {
      ...data,
      timestamp: serverTimestamp()
    });
    return docRef;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateBudget = async (userId: string | undefined, budgetId: string, data: Partial<Omit<Budget, 'id' | 'timestamp'>>) => {
  if (!userId) throw new Error('User ID is required for updateBudget');
  const path = `users/${userId}/budgets`;
  try {
    const docRef = doc(db, path, budgetId);
    await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${path}/${budgetId}`);
  }
};

export const deleteBudget = async (userId: string | undefined, budgetId: string) => {
  if (!userId) throw new Error('User ID is required for deleteBudget');
  const path = `users/${userId}/budgets`;
  try {
    const docRef = doc(db, path, budgetId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${path}/${budgetId}`);
  }
};

/**
 * Transactions
 */
export const addTransaction = async (userId: string | undefined, data: Omit<Transaction, 'id' | 'timestamp'>) => {
  if (!userId) throw new Error('User ID is required for addTransaction');
  
  // STEP 1 & 2: Standardize and force lowercase
  const type = data.type.toLowerCase();
  
  // Force source to 'manual' if not provided explicitly (safety first)
  const source = data.source || 'manual';
  
  // STEP 6: Validate before save
  if (type !== 'income' && type !== 'expense') {
    throw new Error(`Invalid transaction type: ${type}. Must be 'income' or 'expense'.`);
  }

  // TASK 7: CATEGORY TYPE MISMATCH VALIDATION
  const matchedCategory = CATEGORIES.find(c => c.name === data.category);
  if (matchedCategory && matchedCategory.type !== type) {
    throw new Error(`Category Mismatch: '${data.category}' belongs to ${matchedCategory.type}s, not ${type}s.`);
  }

  // AUTO-CATEGORIZATION LOGIC
  let category = data.category;
  let isCategoryConfirmed = data.isCategoryConfirmed;
  let categoryConfidence = data.categoryConfidence;
  let notes = data.notes;
  let senderId = data.senderId;

  // TASK 1: Hard Source Separation & TASK 3/4: Validation
  if (source === 'auto' || source === 'sms') {
    // If it's pure SMS or AUTO, we must have rawSMS payload else REJECT
    if (!data.rawSMS) {
        console.warn("REJECTED: Auto transaction without valid SMS payload");
        return null; // Block ghost transactions
    }
  }

  // If MANUAL source, do NOT run SMS extractor on notes
  if (source === 'manual') {
    // Task 3: No fake brand names for manual entries
    // If merchant/notes is suspiciously like one of our catchwords but it's manual, we keep it as "Manual Entry" if it's default
    if (!notes || notes === 'Other' || notes === 'Unknown' || notes === 'Other Expense' || notes === 'Other Income') {
        notes = 'Manual Entry';
    }
    // STRICT SOURCE VALIDATION (Task 3): Manual transactions MUST NOT have these
    senderId = undefined;
    (data as any).rawSMS = undefined;
  }

  // Only auto-categorize if notes/description is available AND category is generic or missing
  if (notes && (category === 'Other' || !category)) {
    const userMappings = await getUserCategoryMappings(userId);
    const result = categorizeTransaction(notes, userMappings);
    
    if (result.isAutoMatched) {
      category = result.category;
      categoryConfidence = result.confidence;
      isCategoryConfirmed = false; // Mark for user confirmation if it's auto-detected
    }
  }

  // STEP 4: Safety log
  console.log(`[DEBUG] ATTEMPTING WRITE: ${type} | Source: ${source} | Category: ${category} | Amount: ${data.amount}`);

  const txDate = data.date || new Date().toLocaleDateString('en-GB');
  const fingerprint = generateFingerprint({
    amount: data.amount,
    date: txDate,
    merchant: notes || category || 'Unknown',
    senderId: senderId,
    rawSMS: (data as any).rawSMS
  });

  // TASK 2: DUPLICATE CHECK
  const path = `users/${userId}/transactions`;
  const duplicateQuery = query(
    collection(db, path),
    where('userId', '==', userId),
    where('fingerprint', '==', fingerprint),
    limit(1)
  );
  const duplicateSnapshot = await getDocs(duplicateQuery);
  
  if (!duplicateSnapshot.empty) {
    console.warn(`[DEBUG] WRITE REJECTED (Duplicate): Fingerprint ${fingerprint}`);
    // For auto-sync, we silently ignore. For manual, the UI will warn (handled in component)
    if (source === 'auto' || source === 'sms') {
      return null; 
    }
    // If it's manual and reached here, we might want to throw if we didn't handle it in UI
    // But better to return the existing one or null
    return null;
  }

  try {
    // Filter out undefined values to prevent Firestore errors
    const cleanData = Object.fromEntries(
      Object.entries({ 
        ...data, 
        userId, // TASK 1: Every transaction MUST include userId
        type, 
        category,
        notes,
        source,
        senderId,
        date: txDate,
        fingerprint,
        isCategoryConfirmed: isCategoryConfirmed ?? (source === 'manual'), // Manual entries are confirmed by default
        categoryConfidence: categoryConfidence ?? 1.0
      }).filter(([_, v]) => v !== undefined)
    );
    
    const docRef = await addDoc(collection(db, path), {
      ...cleanData,
      timestamp: serverTimestamp()
    });

    console.log(`[DEBUG] WRITE SUCCESS: Doc ID ${docRef.id} | Total count check needed`);

    // TASK 10: AUTO-LINK EMI TRANSACTIONS
    if (type === 'expense') {
      try {
        const loansPath = `users/${userId}/loans`;
        const loansSnap = await getDocs(query(collection(db, loansPath), where('status', '==', 'active')));
        const activeLoans = loansSnap.docs.map(d => ({ id: d.id, ...d.data() } as Loan));
        
        const matchedLoan = activeLoans.find(loan => {
          const amountDiff = Math.abs(loan.emi - data.amount);
          const isSimilarAmount = amountDiff <= loan.emi * 0.1;
          const notesLower = (notes || '').toString().toLowerCase();
          const merchantLower = (cleanData.merchant || '').toString().toLowerCase();
          const lenderLower = (loan.lenderName || '').toString().toLowerCase();
          const isLenderMatch = lenderLower.includes(merchantLower) || merchantLower.includes(lenderLower);
          const isKeywordMatch = notesLower.includes('emi') || notesLower.includes('loan');
          
          return isSimilarAmount && (isLenderMatch || isKeywordMatch);
        });

        if (matchedLoan) {
          console.log("Auto-linking transaction to loan:", matchedLoan.name);
          await updateDoc(docRef, { isLoanEMI: true });
        }
      } catch (e) {
        console.error("Auto-linking check failed:", e);
      }
    }

    updateFinancialSnapshot(userId).catch(console.error);
    return docRef;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};
export const getTransactions = async (userId: string | undefined) => {
  if (!userId) return [];
  const path = `users/${userId}/transactions`;
  try {
    const q = query(
      collection(db, path), 
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Transaction[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const updateTransaction = async (userId: string | undefined, transactionId: string, data: Partial<Omit<Transaction, 'id' | 'timestamp'>>) => {
  if (!userId) throw new Error('User ID is required for updateTransaction');
  const path = `users/${userId}/transactions`;
  try {
    const docRef = doc(db, path, transactionId);
    
    // Standardize type if provided
    let cleanData = { ...data };
    if (data.type) {
      const type = data.type.toLowerCase();
      if (type !== 'income' && type !== 'expense') {
        throw new Error(`Invalid transaction type: ${type}. Must be 'income' or 'expense'.`);
      }
      
      // TASK 7: CATEGORY TYPE MISMATCH VALIDATION (on type update)
      // If category is also provided, check it. Otherwise check against existing if we had it (complex)
      // Simplest: If both provided, validate.
      if (data.category) {
        const matchedCategory = CATEGORIES.find(c => c.name === data.category);
        if (matchedCategory && matchedCategory.type !== type) {
           throw new Error(`Category Mismatch: '${data.category}' belongs to ${matchedCategory.type}s, not ${type}s.`);
        }
      }
      
      cleanData.type = type as 'income' | 'expense';
    } else if (data.category) {
      // If only category is provided, check against the CURRENT type of the transaction
      try {
        const currentDoc = await getDoc(docRef);
        const currentData = currentDoc.data() as Transaction;
        const currentType = currentData.type;
        const matchedCategory = CATEGORIES.find(c => c.name === data.category);
        if (matchedCategory && matchedCategory.type !== currentType) {
           throw new Error(`Category Mismatch: '${data.category}' belongs to ${matchedCategory.type}s, not ${currentType}s.`);
        }
      } catch (e) {
        console.warn("Update validation skipped (could not fetch doc):", e);
      }
    }

    // Filter out undefined values
    const finalData = Object.fromEntries(
      Object.entries(cleanData).filter(([_, v]) => v !== undefined)
    );

    await updateDoc(docRef, finalData);

    // LEARNING LOGIC: If category was updated manually, learn this mapping
    if (data.category && userId) {
      const fetchAndLearn = async () => {
        try {
          const currentDoc = await getDoc(docRef);
          const currentData = currentDoc.data() as Transaction;
          if (currentData?.notes) {
            await updateUserCategoryMapping(userId, currentData.notes, data.category!);
          }
        } catch (e) {
          console.error("Learning failed:", e);
        }
      };
      fetchAndLearn();
    }

    updateFinancialSnapshot(userId).catch(console.error);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${path}/${transactionId}`);
  }
};

export const deleteTransaction = async (userId: string | undefined, transactionId: string) => {
  if (!userId) throw new Error('User ID is required for deleteTransaction');
  const path = `users/${userId}/transactions`;
  try {
    const docRef = doc(db, path, transactionId);
    await deleteDoc(docRef);
    updateFinancialSnapshot(userId).catch(console.error);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${path}/${transactionId}`);
  }
};

export const deleteTransactionsBulk = async (userId: string | undefined, transactionIds: string[]) => {
  if (!userId) throw new Error('User ID is required for bulk delete');
  if (transactionIds.length === 0) return;
  
  const batch = writeBatch(db);
  const path = `users/${userId}/transactions`;
  
  transactionIds.forEach(id => {
    const docRef = doc(db, path, id);
    batch.delete(docRef);
  });
  
  try {
    await batch.commit();
    updateFinancialSnapshot(userId).catch(console.error);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const checkDuplicate = async (userId: string | undefined, fingerprint: string) => {
  if (!userId) return false;
  const path = `users/${userId}/transactions`;
  try {
    const q = query(
      collection(db, path),
      where('userId', '==', userId),
      where('fingerprint', '==', fingerprint),
      limit(1)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error("Duplicate check error:", error);
    return false;
  }
};

export const resetTransactions = async (userId: string | undefined) => {
  if (!userId) return;
  const path = `users/${userId}/transactions`;
  try {
    const q = query(collection(db, path));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return;
    
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    updateFinancialSnapshot(userId).catch(console.error);
    console.log(`Database Reset: Cleared ${snapshot.size} transactions for user ${userId}`);
  } catch (error) {
    console.error("Error resetting database:", error);
  }
};

/**
 * Assets
 */
export const addAsset = async (userId: string | undefined, data: Omit<Asset, 'id' | 'timestamp'>) => {
  if (!userId) throw new Error('User ID is required for addAsset');
  const path = `users/${userId}/assets`;
  try {
    // Filter out undefined values to prevent Firestore errors
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );

    const docRef = await addDoc(collection(db, path), {
      ...cleanData,
      timestamp: serverTimestamp()
    });
    updateFinancialSnapshot(userId).catch(console.error);
    return docRef;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const getAssets = async (userId: string | undefined) => {
  if (!userId) return [];
  const path = `users/${userId}/assets`;
  try {
    const q = query(collection(db, path), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Asset[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

/**
 * Liabilities
 */
export const addLiability = async (userId: string | undefined, data: Omit<Liability, 'id' | 'timestamp'>) => {
  if (!userId) throw new Error('User ID is required for addLiability');
  const path = `users/${userId}/liabilities`;
  try {
    // Filter out undefined values to prevent Firestore errors
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );

    const docRef = await addDoc(collection(db, path), {
      ...cleanData,
      timestamp: serverTimestamp()
    });
    updateFinancialSnapshot(userId).catch(console.error);
    return docRef;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const getLiabilities = async (userId: string | undefined) => {
  if (!userId) return [];
  const path = `users/${userId}/liabilities`;
  try {
    const q = query(collection(db, path), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Liability[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

/**
 * Loans
 */
export const addLoan = async (userId: string | undefined, data: Omit<Loan, 'id' | 'timestamp'>) => {
  if (!userId) throw new Error('User ID is required for addLoan');
  const path = `users/${userId}/loans`;
  try {
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );

    const docRef = await addDoc(collection(db, path), {
      ...cleanData,
      timestamp: serverTimestamp()
    });
    updateFinancialSnapshot(userId).catch(console.error);
    return docRef;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const getLoans = async (userId: string | undefined) => {
  if (!userId) return [];
  const path = `users/${userId}/loans`;
  try {
    const q = query(collection(db, path), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Loan[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const updateLoan = async (userId: string | undefined, loanId: string, data: Partial<Omit<Loan, 'id' | 'timestamp'>>) => {
  if (!userId) throw new Error('User ID is required for updateLoan');
  const path = `users/${userId}/loans`;
  try {
    const docRef = doc(db, path, loanId);
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );
    await updateDoc(docRef, cleanData);
    updateFinancialSnapshot(userId).catch(console.error);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${path}/${loanId}`);
  }
};

export const deleteLoan = async (userId: string | undefined, loanId: string) => {
  if (!userId) throw new Error('User ID is required for deleteLoan');
  const path = `users/${userId}/loans`;
  try {
    const docRef = doc(db, path, loanId);
    await deleteDoc(docRef);
    updateFinancialSnapshot(userId).catch(console.error);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${path}/${loanId}`);
  }
};

/**
 * Portfolio Assets
 */
export const addPortfolioAsset = async (userId: string | undefined, data: any) => {
  if (!userId) throw new Error('User ID is required for addPortfolioAsset');
  const path = `users/${userId}/portfolio`;
  try {
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );

    const docRef = await addDoc(collection(db, path), {
      ...cleanData,
      timestamp: serverTimestamp()
    });
    updateFinancialSnapshot(userId).catch(console.error);
    return docRef;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const getPortfolioAssets = async (userId: string | undefined) => {
  if (!userId) return [];
  const path = `users/${userId}/portfolio`;
  try {
    const q = query(collection(db, path), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[]; // Using any[] to avoid circular dependency if PortfolioAsset is not imported
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

/**
 * Financial Goals
 */
export const addGoal = async (userId: string | undefined, data: any) => {
  if (!userId) throw new Error('User ID is required for addGoal');
  const path = `users/${userId}/goals`;
  try {
    const docRef = await addDoc(collection(db, path), {
      ...data,
      timestamp: serverTimestamp()
    });
    return docRef;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};
