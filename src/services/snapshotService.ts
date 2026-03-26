import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  getTransactions, 
  getAssets, 
  getLiabilities,
  getLoans
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
    const netWorth = calculateNetWorth(assets, liabilities);
    const cashflow = calculateCashflow(income, expenses);
    const savingsRate = calculateSavingsRate(income, expenses);
    
    // Retention insights
    const monthlyStatus = getMonthlyStatus(income, expenses);
    const monthlyTrend = getMonthlyTrend(transactions);
    const progressSignal = getProgressSignal(income, expenses);

    const snapshot: Omit<FinancialSnapshot, 'updatedAt'> & { updatedAt: any } = {
      income,
      expenses,
      netWorth,
      cashflow,
      savingsRate,
      monthlyStatus,
      monthlyTrend,
      progressSignal,
      updatedAt: serverTimestamp()
    };

    const snapshotRef = doc(db, `users/${userId}/meta/financialSnapshot`);
    await setDoc(snapshotRef, snapshot);
    return snapshot;
  } catch (error) {
    console.error("Error updating financial snapshot:", error);
    return null;
  }
};

/**
 * Fetches the pre-calculated financial snapshot for a user.
 */
export const getFinancialSnapshot = async (userId: string): Promise<FinancialSnapshot | null> => {
  if (!userId) return null;
  
  try {
    const snapshotRef = doc(db, `users/${userId}/meta/financialSnapshot`);
    const docSnap = await getDoc(snapshotRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as FinancialSnapshot;
    }
  } catch (error) {
    console.error("Error fetching financial snapshot:", error);
  }
  return null;
};
