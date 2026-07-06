import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocFromCache,
  getDocFromServer,
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { 
  getTransactions, 
  getAssets, 
  getLiabilities,
  getLoans,
  getPortfolioAssets
} from './financeService';
import { 
  calculateMonthlyIncome, 
  calculateMonthlyExpenses, 
  calculateNetWorth,
  calculateCashflow,
  calculateSavingsRate
} from '../lib/financialEngine';
import { 
  getMonthlyStatus, 
  getMonthlyTrend, 
  getProgressSignal 
} from '../lib/retentionEngine';
import { FinancialSnapshot } from '../types';

/**
 * Updates the financial snapshot for a user by aggregating data from transactions, assets, and liabilities.
 * This function should be called whenever relevant data is added or modified.
 */
export const updateFinancialSnapshot = async (userId: string) => {
  if (!userId) return;

  try {
    const [transactions, assets, liabilities, loans] = await Promise.all([
      getTransactions(userId),
      getAssets(userId),
      getLiabilities(userId),
      getLoans(userId)
    ]);

    const income = calculateMonthlyIncome(transactions);
    const expenses = calculateMonthlyExpenses(transactions, loans);
    
    // New Net Worth Engine logic
    const { calculateCashBalance, calculatePortfolioValue, calculateTotalLoanRemaining } = await import('../lib/financialEngine');
    const cashBalance = calculateCashBalance(transactions);
    const portfolioAssets = await getPortfolioAssets(userId);
    const portfolioValue = calculatePortfolioValue(portfolioAssets);
    const loanBalance = calculateTotalLoanRemaining(loans);
    
    const netWorth = calculateNetWorth(cashBalance, portfolioValue, loanBalance);
    const cashflow = calculateCashflow(income, expenses);
    const savingsRate = calculateSavingsRate(income, expenses);
    
    // Retention insights
    const monthlyStatus = getMonthlyStatus(income, expenses);
    const monthlyTrend = getMonthlyTrend(transactions);
    const progressSignal = getProgressSignal(income, expenses);

    const snapshot: Omit<FinancialSnapshot, 'updatedAt'> & { updatedAt: any } = {
      netWorth,
      cashflow,
      savingsRate,
      monthlyStatus,
      monthlyTrend,
      progressSignal,
      updatedAt: serverTimestamp()
    };

    const snapshotRef = doc(db, `users/${userId}/meta/financialSnapshot`);
    try {
      await setDoc(snapshotRef, snapshot);
      return snapshot;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, snapshotRef.path);
    }
  } catch (error) {
    console.error("Error updating financial snapshot:", error);
    return null;
  }
};

/**
 * Saves the smart financial analysis to Firestore.
 */
export const saveSmartAnalysis = async (userId: string, analysis: any) => {
  if (!userId || !analysis) return;
  const analysisRef = doc(db, `users/${userId}/meta/smartAnalysis`);
  try {
    await setDoc(analysisRef, {
      ...analysis,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, analysisRef.path);
  }
};

/**
 * Fetches the last saved smart financial analysis.
 */
export const getSmartAnalysis = async (userId: string) => {
  if (!userId) return null;
  const analysisRef = doc(db, `users/${userId}/meta/smartAnalysis`);
  try {
    // Try to get from cache first for better offline experience
    try {
      const cachedSnap = await getDocFromCache(analysisRef);
      if (cachedSnap.exists()) {
        return cachedSnap.data();
      }
    } catch (cacheError) {
      // Ignore cache errors, proceed to server
    }
    
    const docSnap = await getDoc(analysisRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.warn("Firestore is offline, returning null for smart analysis.");
      return null;
    }
    handleFirestoreError(error, OperationType.GET, analysisRef.path);
  }
  return null;
};

/**
 * Fetches the pre-calculated financial snapshot for a user.
 */
export const getFinancialSnapshot = async (userId: string): Promise<FinancialSnapshot | null> => {
  if (!userId) return null;
  
  try {
    const snapshotRef = doc(db, `users/${userId}/meta/financialSnapshot`);
    
    // Try to get from cache first
    try {
      const cachedSnap = await getDocFromCache(snapshotRef);
      if (cachedSnap.exists()) {
        return cachedSnap.data() as FinancialSnapshot;
      }
    } catch (cacheError) {
      // Ignore cache errors
    }

    const docSnap = await getDoc(snapshotRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as FinancialSnapshot;
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.warn("Firestore is offline, returning null for financial snapshot.");
      return null;
    }
    handleFirestoreError(error, OperationType.GET, `users/${userId}/meta/financialSnapshot`);
  }
  return null;
};
