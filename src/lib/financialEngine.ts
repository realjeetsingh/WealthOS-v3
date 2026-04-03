/**
 * Financial State Engine
 * 
 * This module contains pure functions for calculating financial metrics.
 * It does not store data in Firestore or handle UI.
 */

import { Transaction, Asset, Liability, Loan } from '../types';

/**
 * calculateTotalEMI(loans)
 * Sums the EMI of all active loans.
 */
export const calculateTotalEMI = (loans: Loan[] | null | undefined): number => {
  if (!loans || !Array.isArray(loans)) return 0;
  return loans
    .filter(l => l.status !== 'completed')
    .reduce((sum, l) => sum + (Number(l.emi) || 0), 0);
};

/**
 * 1. calculateMonthlyIncome(transactions)
 * Sums all transactions of type "income" for the current month.
 */
export const calculateMonthlyIncome = (transactions: Transaction[] | null | undefined): number => {
  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) return 0;
  
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return transactions
    .filter(t => {
      const d = t.timestamp?.toDate ? t.timestamp.toDate() : new Date();
      return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type === 'income';
    })
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
};

/**
 * 2. calculateMonthlyExpenses(transactions, loans)
 * Sums all transactions of type "expense" for the current month + total EMI.
 */
export const calculateMonthlyExpenses = (
  transactions: Transaction[] | null | undefined,
  loans: Loan[] | null | undefined
): number => {
  const totalEMI = calculateTotalEMI(loans);
  
  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) return totalEMI;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const currentMonthExpenses = transactions
    .filter(t => {
      const d = t.timestamp?.toDate ? t.timestamp.toDate() : new Date();
      return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type === 'expense';
    })
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  return currentMonthExpenses + totalEMI;
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
 * 5. calculateNetWorth(cashBalance, portfolioValue, loanBalance)
 * Returns cash balance + portfolio value minus loan balance.
 */
export const calculateNetWorth = (
  cashBalance: number, 
  portfolioValue: number, 
  loanBalance: number
): number => {
  const result = (Number(cashBalance) || 0) + (Number(portfolioValue) || 0) - (Number(loanBalance) || 0);
  return isNaN(result) ? 0 : result;
};

/**
 * 6. calculateCashBalance(transactions)
 * Sums all income minus all expenses (all time).
 */
export const calculateCashBalance = (transactions: Transaction[] | null | undefined): number => {
  if (!transactions || !Array.isArray(transactions)) return 0;
  
  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    
  const expenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    
  return income - expenses;
};

/**
 * 7. calculatePortfolioValue(portfolioAssets)
 * Sums the current value of all portfolio assets.
 */
export const calculatePortfolioValue = (assets: any[] | null | undefined): number => {
  if (!assets || !Array.isArray(assets)) return 0;
  return assets.reduce((sum, a) => sum + (Number(a.currentValue) || 0), 0);
};

/**
 * 8. calculateTotalLoanRemaining(loans)
 * Sums the remaining amount of all active loans.
 */
export const calculateTotalLoanRemaining = (loans: Loan[] | null | undefined): number => {
  if (!loans || !Array.isArray(loans)) return 0;
  return loans
    .filter(l => l.status !== 'completed')
    .reduce((sum, l) => sum + (Number(l.remainingAmount) || 0), 0);
};

/**
 * 9. calculate10YearProjection(currentNetWorth, monthlyCashflow, annualGrowthRate)
 * Deterministic projection formula:
 * futureValue = currentNetWorth + (monthlyCashflow * 12 * ((1 + r)^n - 1) / r)
 * where r is annualGrowthRate / 12 and n is 120 months.
 * Simplified if r=0: futureValue = currentNetWorth + (monthlyCashflow * 12 * 10)
 */
export const calculate10YearProjection = (
  currentNetWorth: number,
  monthlyCashflow: number,
  annualGrowthRate: number = 0.08 // Default 8% growth
): number => {
  const n = 10; // 10 years
  const monthlyRate = annualGrowthRate / 12;
  const months = n * 12;

  let projectedValue = 0;

  if (monthlyRate === 0) {
    projectedValue = currentNetWorth + (monthlyCashflow * months);
  } else {
    // Future value of a series (annuity) + initial principal growth
    // FV = P(1+r)^n + PMT * (((1+r)^n - 1) / r)
    const principalGrowth = currentNetWorth * Math.pow(1 + monthlyRate, months);
    const contributionsGrowth = monthlyCashflow * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    projectedValue = principalGrowth + contributionsGrowth;
  }
  
  // PART 6 — SANITY CHECK SYSTEM
  // IF projected < (cashflow * 12 * years * 0.5) → Mark as INVALID → Recalculate
  const baseline = monthlyCashflow * 12 * n * 0.5;
  if (projectedValue < baseline && monthlyCashflow > 0) {
    // Recalculate using a more conservative but safe linear model if compounding fails or produces absurd results
    return currentNetWorth + (monthlyCashflow * 12 * n);
  }

  return Math.max(0, projectedValue);
};

/**
 * 10. calculateFinancialImpact(projectedBase, projectedWithStrategy)
 * impact = (Projected Wealth with Strategy) - (Current Path Projection)
 */
export const calculateFinancialImpact = (
  projectedBase: number,
  projectedWithStrategy: number
): number => {
  return Math.max(0, projectedWithStrategy - projectedBase);
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
