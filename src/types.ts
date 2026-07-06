import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  role: string;
  isPremium: boolean;
  plan?: 'free' | 'pro';
  onboardingCompleted?: boolean;
  financialRevealSeen?: boolean;
  onboardingStep?: number;
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
  notificationSyncEnabled?: boolean;
  notificationPermissionAsked?: boolean;
  notificationEducationSeen?: boolean;
  streakCount?: number;
  lastActiveDate?: Timestamp;
  viewedLessons?: string[];
  lastAcademyTopic?: string;
  lastActiveLessonId?: string;
  createdAt: Timestamp;
}

export interface Transaction {
  id?: string;
  userId?: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  notes?: string;
  source?: 'manual' | 'auto' | 'sms' | 'aa';
  status?: 'review' | 'verified';
  isCategoryConfirmed?: boolean;
  categoryConfidence?: number;
  rawSMS?: string;
  senderId?: string;
  merchant?: string;
  fingerprint?: string;
  date?: string;
  timestamp: Timestamp;
  isLoanEMI?: boolean;
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
  userId?: string;
  name: string;
  lenderName: string;
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
  paidMonths: number;
  totalAmount: number;
  totalInterest: number;
  emi: number;
  remainingAmount: number;
  startDate: string;
  emiDueDate?: number;
  nextEmiDate?: string;
  lastPaidDate?: string;
  endDate?: string;
  status: 'active' | 'completed' | 'closed';
  timestamp: Timestamp;
  dataSource?: 'manual' | 'sms' | 'aa';
}

export interface LoanSuggestion {
  id: string;
  merchant: string;
  lender?: string;
  amount: number;
  date: string;
  frequency: number; // number of occurrences
  confidence: 'high' | 'medium' | 'low';
  score: number;
  transactionIds: string[];
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
  category: 'Stocks' | 'Crypto' | 'Real Estate' | 'Bonds' | 'Gold' | 'Others';
  assetName: string;
  symbol: string; // Ticker for Stocks/Crypto
  assetType: 'equity' | 'crypto' | 'mf' | 'precious_metals' | 'real_estate' | 'fixed_income' | 'others';
  trackingMode: 'api' | 'manual';
  quantity: number;
  avgBuyPrice: number;
  lastPrice: number; // For API tracked, this is the market price. For manual, it's the last recorded valuation.
  investedAmount: number;
  currentValue: number;
  lastUpdatedAt?: Timestamp;
  manualValuationAt?: Timestamp | null; // Specifically for manual modes
  metadata: {
    investmentDate?: string;
    propertyName?: string;
    rentalIncome?: number;
    bondName?: string;
    interestRate?: number;
    maturityDate?: string;
    weight?: number;
    coinName?: string;
    coinId?: string; // For CoinGecko etc.
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
