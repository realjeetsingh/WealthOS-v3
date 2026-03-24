/**
 * Financial State Engine
 * 
 * This module contains pure functions for calculating financial metrics.
 * It does not store data in Firestore or handle UI.
 */

import { Transaction, Asset, Liability } from '../types';

/**
 * 1. calculateMonthlyIncome(transactions)
 * Sums all transactions of type "income".
 */
export const calculateMonthlyIncome = (transactions: Transaction[] | null | undefined): number => {
  if (!transactions || !Array.isArray(transactions)) return 0;
  
  const result = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  return isNaN(result) ? 0 : result;
};

/**
 * 2. calculateMonthlyExpenses(transactions)
 * Sums all transactions of type "expense".
 */
export const calculateMonthlyExpenses = (transactions: Transaction[] | null | undefined): number => {
  if (!transactions || !Array.isArray(transactions)) return 0;
  
  const result = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  return isNaN(result) ? 0 : result;
};

/**
 * 3. calculateCashflow(income, expenses)
 * Returns the difference between income and expenses.
 */
export const calculateCashflow = (income: number, expenses: number): number => {
  const result = (Number(income) || 0) - (Number(expenses) || 0);
  return isNaN(result) ? 0 : result;
};

/**
 * 4. calculateSavingsRate(income, expenses)
 * Returns the savings rate as a decimal (e.g., 0.6 for 60%).
 * If income is 0, returns 0.
 */
export const calculateSavingsRate = (income: number, expenses: number): number => {
  const inc = Number(income) || 0;
  const exp = Number(expenses) || 0;
  if (inc === 0) return 0;
  
  const savings = inc - exp;
  const result = savings / inc;
  return isNaN(result) ? 0 : result;
};

/**
 * 5. calculateNetWorth(assets, liabilities)
 * Returns total assets minus total liabilities.
 */
export const calculateNetWorth = (assets: Asset[] | null | undefined, liabilities: Liability[] | null | undefined): number => {
  const totalAssets = (assets || [])
    .reduce((sum, a) => sum + (Number(a.value) || 0), 0);
    
  const totalLiabilities = (liabilities || [])
    .reduce((sum, l) => sum + (Number(l.remainingBalance) || 0), 0);
    
  const result = totalAssets - totalLiabilities;
  return isNaN(result) ? 0 : result;
};

/**
 * Sample Data Test (Internal Documentation)
 * 
 * transactions:
 * - income: 50000
 * - expense: 20000
 * 
 * Expected:
 * income = 50000
 * expenses = 20000
 * cashflow = 30000
 * savings_rate = 0.6
 */
