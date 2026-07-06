
import { Transaction } from '../types';

export type FinancialState = 
  | 'RECOVERY_MODE'         // Negative NW, but managing
  | 'IMPROVING_STABILITY'  // Positive NW but high debt/low savings
  | 'DEBT_REDUCTION'       // Focus on clearing loans
  | 'STABLE_GROWTH'        // Solid NW, positive cashflow
  | 'WEALTH_ACCELERATION';  // High surplus, efficient investing

export interface FinancialHealthSummary {
  state: FinancialState;
  stateLabel: string;
  stateDescription: string;
  isPositive: boolean;
  recoveryProgress?: number;
}

export function deriveFinancialState(
  netWorth: number,
  cashflow: number,
  loanBalance: number,
  monthlyIncome: number
): FinancialHealthSummary {
  const isNetWorthNegative = netWorth < 0;
  const debtToIncomeRatio = monthlyIncome > 0 ? loanBalance / (monthlyIncome * 12) : 0;
  const savingsRate = monthlyIncome > 0 ? cashflow / monthlyIncome : 0;

  if (isNetWorthNegative) {
    return {
      state: 'RECOVERY_MODE',
      stateLabel: 'Recovery Mode',
      stateDescription: 'Focusing on debt reduction and base stability.',
      isPositive: cashflow > 0,
      recoveryProgress: Math.min(100, Math.max(0, 100 + (netWorth / (monthlyIncome * 6 || 1) * 100))) 
    };
  }

  if (loanBalance > 0 && debtToIncomeRatio > 0.4) {
    return {
      state: 'DEBT_REDUCTION',
      stateLabel: 'Debt Reduction Phase',
      stateDescription: 'Prioritizing high-interest liability clearance.',
      isPositive: true
    };
  }

  if (savingsRate < 0.1) {
    return {
      state: 'IMPROVING_STABILITY',
      stateLabel: 'Improving Stability',
      stateDescription: 'Building emergency reserves and liquidity.',
      isPositive: true
    };
  }

  if (savingsRate >= 0.3 && netWorth > monthlyIncome * 12) {
    return {
      state: 'WEALTH_ACCELERATION',
      stateLabel: 'Wealth Acceleration',
      stateDescription: 'Optimizing surplus for maximum compounding.',
      isPositive: true
    };
  }

  return {
    state: 'STABLE_GROWTH',
    stateLabel: 'Stable Growth',
    stateDescription: 'Expanding net worth through consistent saving.',
    isPositive: true
  };
}
