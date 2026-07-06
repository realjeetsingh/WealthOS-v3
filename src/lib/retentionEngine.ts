/**
 * Retention Engine
 * 
 * This module provides daily feedback and behavioral signals to the user.
 * It focuses on simple, actionable daily and monthly insights.
 */

import { Transaction } from '../types';
import { Timestamp } from 'firebase/firestore';
import { formatCurrencyShort } from './formatCurrency';

/**
 * 1. getMonthlyStatus(income, expenses)
 * Calculates monthly cashflow and returns a feedback message.
 */
export const getMonthlyStatus = (income: number, expenses: number): string => {
  const cashflow = (Number(income) || 0) - (Number(expenses) || 0);

  if (cashflow > 0) {
    return `You are saving ${formatCurrencyShort(cashflow)} this month`;
  } else if (cashflow < 0) {
    return `You are overspending by ${formatCurrencyShort(Math.abs(cashflow))} this month`;
  } else {
    return "Your income and expenses are balanced this month";
  }
};

/**
 * 2. getMonthlyTrend(transactions)
 * Compares current month spending vs previous month.
 */
export const getMonthlyTrend = (transactions: Transaction[] | null | undefined): string => {
  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
    return "Add transactions to see trends";
  }

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const prevMonth = prevMonthDate.getMonth();
  const prevYear = prevMonthDate.getFullYear();

  const currentMonthExpenses = transactions
    .filter(t => {
      const d = (typeof t.timestamp?.toDate === 'function') ? t.timestamp.toDate() : null;
      return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type === 'expense';
    })
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const prevMonthExpenses = transactions
    .filter(t => {
      const d = (typeof t.timestamp?.toDate === 'function') ? t.timestamp.toDate() : null;
      return d && d.getMonth() === prevMonth && d.getFullYear() === prevYear && t.type === 'expense';
    })
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  if (currentMonthExpenses === 0 && prevMonthExpenses === 0) {
    return "Add transactions to see trends";
  }

  if (prevMonthExpenses === 0) {
    return "No data from last month";
  }

  const diff = currentMonthExpenses - prevMonthExpenses;

  if (diff > 0) {
    return `Spending increased by ${formatCurrencyShort(diff)}`;
  } else if (diff < 0) {
    return `Spending decreased by ${formatCurrencyShort(Math.abs(diff))}`;
  } else {
    return "Spending unchanged";
  }
};

/**
 * 3. getProgressSignal(income, expenses)
 * Returns a signal about savings health.
 */
export const getProgressSignal = (income: number, expenses: number): string => {
  const savings = income - expenses;

  if (savings > 0) {
    return "You're improving your savings";
  } else if (savings < 0) {
    return "Your savings rate is dropping";
  } else {
    return "Your savings are currently flat";
  }
};

/**
 * 4. getWeeklySummary(transactions)
 * Calculates weekly income, expenses, and savings compared to last week.
 */
export const getWeeklySummary = (transactions: Transaction[]) => {
  const now = new Date();
  const startOfThisWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  startOfThisWeek.setHours(0, 0, 0, 0);
  
  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  const thisWeek = transactions.filter(t => (typeof t.timestamp?.toDate === 'function') && t.timestamp.toDate() >= startOfThisWeek);
  const lastWeek = transactions.filter(t => {
    const d = (typeof t.timestamp?.toDate === 'function') ? t.timestamp.toDate() : null;
    return d && d >= startOfLastWeek && d < startOfThisWeek;
  });

  const calc = (list: Transaction[]) => ({
    income: list.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    expenses: list.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
  });

  const thisWeekStats = calc(thisWeek);
  const lastWeekStats = calc(lastWeek);

  return {
    thisWeek: {
      ...thisWeekStats,
      savings: thisWeekStats.income - thisWeekStats.expenses
    },
    lastWeek: {
      ...lastWeekStats,
      savings: lastWeekStats.income - lastWeekStats.expenses
    }
  };
};

/**
 * 5. getAlerts(income, expenses, lastActiveDate)
 * Logic-based alerts for overspending, negative cashflow, and inactivity.
 */
export interface Alert {
  type: 'danger' | 'warning' | 'info';
  title: string;
  message: string;
}

export const getAlerts = (income: number, expenses: number, lastActiveDate?: Timestamp): Alert[] => {
  const alerts: Alert[] = [];
  const cashflow = income - expenses;

  if (cashflow < 0) {
    alerts.push({
      type: 'danger',
      title: 'Negative Cashflow',
      message: `You've spent ${formatCurrencyShort(Math.abs(cashflow))} more than you earned this month.`
    });
  }

  if (income > 0 && expenses > income * 0.8) {
    alerts.push({
      type: 'warning',
      title: 'High Spending',
      message: `Your expenses have reached ${Math.round((expenses / income) * 100)}% of your monthly income.`
    });
  }

  if (lastActiveDate && typeof lastActiveDate.toDate === 'function') {
    const lastActive = lastActiveDate.toDate();
    const daysInactive = Math.floor((new Date().getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
    if (daysInactive >= 3) {
      alerts.push({
        type: 'info',
        title: 'Inactivity Alert',
        message: `It's been ${daysInactive} days since your last update. Keep your records fresh!`
      });
    }
  }

  return alerts;
};

/**
 * 6. getUpgradedInsights(income, expenses, transactions)
 * Numeric, specific, and actionable insights.
 */
export const getUpgradedInsights = (income: number, expenses: number, transactions: Transaction[]) => {
  const insights = [];
  const savings = income - expenses;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;

  if (savingsRate < 20 && income > 0) {
    const targetSavings = income * 0.2;
    const gap = targetSavings - savings;
    insights.push({
      title: 'Boost Savings Rate',
      description: `Your current savings rate is ${Math.round(savingsRate)}%. To reach the recommended 20%, try to save an additional ${formatCurrencyShort(gap)} this month.`,
      action: 'Review non-essential expenses'
    });
  }

  // Category specific insight
  const categoryTotals: Record<string, number> = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });

  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  if (topCategory) {
    insights.push({
      title: `Optimize ${topCategory[0]}`,
      description: `You've spent ${formatCurrencyShort(topCategory[1])} on ${topCategory[0]} this month, which is your highest expense category.`,
      action: `Set a budget for ${topCategory[0]}`
    });
  }

  return insights;
};
