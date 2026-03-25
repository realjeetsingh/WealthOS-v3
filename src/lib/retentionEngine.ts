/**
 * Retention Engine
 * 
 * This module provides daily feedback and behavioral signals to the user.
 * It focuses on simple, actionable daily and monthly insights.
 */

import { Transaction } from '../types';
import { formatCurrency } from './formatCurrency';

/**
 * 1. getMonthlyStatus(income, expenses)
 * Calculates monthly cashflow and returns a feedback message.
 */
export const getMonthlyStatus = (income: number, expenses: number): string => {
  const cashflow = (Number(income) || 0) - (Number(expenses) || 0);

  if (cashflow > 0) {
    return `You are saving ${formatCurrency(cashflow)} this month`;
  } else if (cashflow < 0) {
    return `You are overspending by ${formatCurrency(Math.abs(cashflow))} this month`;
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
      const d = t.timestamp?.toDate();
      return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type === 'expense';
    })
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const prevMonthExpenses = transactions
    .filter(t => {
      const d = t.timestamp?.toDate();
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
    return `Spending increased by ${formatCurrency(diff)}`;
  } else if (diff < 0) {
    return `Spending decreased by ${formatCurrency(Math.abs(diff))}`;
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
