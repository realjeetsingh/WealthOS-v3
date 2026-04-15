import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  role: string;
  isPremium: boolean;
  onboardingCompleted?: boolean;
  hasSeenIntro?: boolean;
  profileImage?: string;
  coverImage?: string;
  currency?: string;
  bio?: string;
  location?: string;
  occupation?: string;
  financialGoals?: string[];
  emailAlerts?: boolean;
  budgetAlerts?: boolean;
  investmentAlerts?: boolean;
  streakCount?: number;
  lastActiveDate?: Timestamp;
  viewedLessons?: string[];
  lastAcademyTopic?: string;
  createdAt: Timestamp;
}

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
  netWorth: number;
  cashflow: number;
  savingsRate: number;
  monthlyStatus: string;
  monthlyTrend: string;
  progressSignal: string;
  updatedAt: Timestamp | any;
}

export interface PortfolioAsset {
  id?: string;
  userId: string;
  category: 'Stocks' | 'Crypto' | 'Real Estate' | 'Bonds' | 'Gold';
  assetName: string;
  investedAmount: number;
  currentValue: number;
  metadata: {
    quantity?: number;
    buyPrice?: number;
    investmentDate?: string;
    coinName?: string;
    propertyName?: string;
    rentalIncome?: number;
    bondName?: string;
    interestRate?: number;
    maturityDate?: string;
    assetType?: string;
    weight?: number;
  };
  timestamp: Timestamp;
}

export interface NetWorthSnapshot {
  id?: string;
  userId: string;
  netWorth: number;
  cashBalance: number;
  portfolioValue: number;
  loanBalance: number;
  timestamp: Timestamp;
}

export interface Budget {
  id?: string;
  category: string;
  limit: number;
  timestamp: Timestamp;
}

export interface Goal {
  id?: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Timestamp;
  category: string;
  status: 'active' | 'completed';
  timestamp: Timestamp;
}
