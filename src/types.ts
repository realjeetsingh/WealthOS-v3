import { Timestamp } from 'firebase/firestore';

export interface Transaction {
  id?: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  notes?: string;
  timestamp: Timestamp;
}

export interface Asset {
  id?: string;
  name: string;
  value: number;
  type: string;
  timestamp: Timestamp;
}

export interface Liability {
  id?: string;
  name: string;
  remainingBalance: number;
  type: string;
  timestamp: Timestamp;
}

export interface FinancialSnapshot {
  income: number;
  expenses: number;
  netWorth: number;
  cashflow: number;
  savingsRate: number;
  dailyStatus: string;
  monthlyTrend: string;
  progressSignal: string;
  updatedAt: Timestamp | any;
}
