/**
 * Retention Engine
 * 
 * This module provides daily feedback and behavioral signals to the user.
 * It focuses on simple, actionable daily and monthly insights.
 */

import { Transaction } from '../types';

/**
 * 1. getDailyStatus(transactions)
 * Calculates today's income and expenses and returns a feedback message.
 */
export const getDailyStatus = (transactions: Transaction[] | null | undefined): string => {
  if (!transactions || !Array.isArray(transactions)) return "No data for today";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayTransactions = transactions.filter(t => {
    const tDate = t.timestamp?.toDate();
    if (!tDate) return false;
    tDate.setHours(0, 0, 0, 0);
    return tDate.getTime() === today.getTime();
  });

  if (todayTransactions.length === 0) return "No transactions recorded today";

  const income = todayTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const expenses = todayTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  if (income > expenses) {
    return `You saved ₹${(income - expenses).toLocaleString()} today`;
  } else if (expenses > income) {
    return `You overspent ₹${(expenses - income).toLocaleString()} today`;
  } else {
    return "Your income and expenses are balanced today";
  }
};

/**
 * 2. getMonthlyTrend(transactions)
 * Compares current month spending vs previous month.
 */
export const getMonthlyTrend = (transactions: Transaction[] | null | undefined): string => {
  if (!transactions || !Array.isArray(transactions)) return "No trend data available";

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const prevMonth = prevMonthDate.getMonth();
  const prevYear = prevMonthDate.getFullYear();

  const currentMonthExpenses = transactions
    .filter(t => {
      const d = t.timestamp?.toDate();
      return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type === 'expense';
    })
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const prevMonthExpenses = transactions
    .filter(t => {
      const d = t.timestamp?.toDate();
      return d && d.getMonth() === prevMonth && d.getFullYear() === prevYear && t.type === 'expense';
    })
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  if (prevMonthExpenses === 0) {
    return currentMonthExpenses > 0 ? "Starting your spending journey this month" : "No spending recorded yet";
  }

  const diff = currentMonthExpenses - prevMonthExpenses;

  if (diff > 0) {
    return `Spending increased by ₹${diff.toLocaleString()} vs last month`;
  } else if (diff < 0) {
    return `Spending decreased by ₹${Math.abs(diff).toLocaleString()} vs last month`;
  } else {
    return "Spending is identical to last month";
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
