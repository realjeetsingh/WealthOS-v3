import { 
  collection, 
  addDoc, 
  getDocs, 
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
  const path = `users/${userId}/transactions`;
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
