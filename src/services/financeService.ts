import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc,
  deleteDoc,
  doc,
  query, 
  orderBy, 
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Transaction, Asset, Liability } from '../types';
import { updateFinancialSnapshot } from './snapshotService';

/**
 * Transactions
 */
export const addTransaction = async (userId: string | undefined, data: Omit<Transaction, 'id' | 'timestamp'>) => {
  if (!userId) throw new Error('User ID is required for addTransaction');
  
  // STEP 1 & 2: Standardize and force lowercase
  const type = data.type.toLowerCase();
  
  // STEP 6: Validate before save
  if (type !== 'income' && type !== 'expense') {
    throw new Error(`Invalid transaction type: ${type}. Must be 'income' or 'expense'.`);
  }

  // STEP 4: Safety log
  console.log("Saving Transaction:", type, data.amount);

  const path = `users/${userId}/transactions`;
  try {
    // Filter out undefined values to prevent Firestore errors
    const cleanData = Object.fromEntries(
      Object.entries({ ...data, type }).filter(([_, v]) => v !== undefined)
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

export const getTransactions = async (userId: string | undefined) => {
  if (!userId) return [];
  const path = `users/${userId}/transactions`;
  try {
    const q = query(collection(db, path), orderBy('timestamp', 'desc'));
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
      cleanData.type = type as 'income' | 'expense';
    }

    // Filter out undefined values
    const finalData = Object.fromEntries(
      Object.entries(cleanData).filter(([_, v]) => v !== undefined)
    );

    await updateDoc(docRef, finalData);
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
