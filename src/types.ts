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

export interface Loan {
  id?: string;
  name: string;
  principalAmount: number;
  tenureMonths: number;
  paidMonths: number;
  totalAmount: number;
  totalInterest: number;
  emi: number;
  remainingAmount: number;
  endDate: string;
  status: 'active' | 'completed';
  timestamp: Timestamp;
}

export interface FinancialSnapshot {
  income: number;
  expenses: number;
  netWorth: number;
  cashflow: number;
  savingsRate: number;
  monthlyStatus: string;
  monthlyTrend: string;
  progressSignal: string;
  updatedAt: Timestamp | any;
}
