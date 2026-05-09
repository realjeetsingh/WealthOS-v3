import { Transaction, Loan, PortfolioAsset, UserProfile } from '../types';
import { calculateMonthlyIncome, calculateMonthlyExpenses } from '../lib/financialEngine';

export interface DailySnapshotData {
  yesterdaySpending: number;
  spendingTrend: 'up' | 'down' | 'neutral';
  spendingPercentChange: number;
  upcomingEMIs: number;
  budgetWarning?: string;
  portfolioMovement: number;
  message: string;
}

export const getDailySnapshot = (
  transactions: Transaction[],
  loans: Loan[],
  portfolio: PortfolioAsset[],
  userProfile: UserProfile | null
): DailySnapshotData => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const dayBeforeYesterday = new Date(yesterday);
  dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1);

  const getExpensesForDate = (date: Date) => {
    return transactions
      .filter(tx => {
        if (!tx.timestamp) return false;
        const txDate = tx.timestamp.toDate();
        return txDate.getFullYear() === date.getFullYear() &&
               txDate.getMonth() === date.getMonth() &&
               txDate.getDate() === date.getDate() &&
               tx.type === 'expense';
      })
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  };

  const yesterdaySpending = getExpensesForDate(yesterday);
  const dayBeforeSpending = getExpensesForDate(dayBeforeYesterday);

  let spendingTrend: 'up' | 'down' | 'neutral' = 'neutral';
  let spendingPercentChange = 0;

  if (dayBeforeSpending > 0) {
    spendingPercentChange = Math.round(((yesterdaySpending - dayBeforeSpending) / dayBeforeSpending) * 100);
    if (spendingPercentChange > 5) spendingTrend = 'up';
    else if (spendingPercentChange < -5) spendingTrend = 'down';
  }

  // Upcoming EMIs (next 3 days)
  const upcomingEMIs = loans
    .filter(loan => {
      if (loan.status !== 'active' || !loan.nextEmiDate) return false;
      const emiDate = loan.nextEmiDate.toDate();
      const diffTime = emiDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 3;
    })
    .length;

  // Portfolio movement (mocking since we don't have historical portfolio snapshots daily easily yet, but we can compute from sync data if available)
  // For now, let's look at average gain/loss from existing assets
  const portfolioMovement = portfolio.reduce((acc, p) => acc + (p.profitPercentage || 0), 0) / (portfolio.length || 1);

  // Message generation
  let message = "Welcome back! Here's what happened while you were away.";
  if (yesterdaySpending === 0) {
    message = "Great! You didn't spend anything yesterday. Your wealth is growing! 🌱";
  } else if (spendingTrend === 'down') {
    message = `Awesome! You spent ${Math.abs(spendingPercentChange)}% less than the day before. Keep it up! 🚀`;
  } else if (spendingTrend === 'up') {
    message = `Heads up: Your spending was up ${spendingPercentChange}% yesterday compared to the previous day. 📊`;
  }

  if (upcomingEMIs > 0) {
    message += ` Also, you have ${upcomingEMIs} EMI${upcomingEMIs > 1 ? 's' : ''} due soon.`;
  }

  return {
    yesterdaySpending,
    spendingTrend,
    spendingPercentChange,
    upcomingEMIs,
    portfolioMovement,
    message
  };
};
