/**
 * Financial Simulation Engine
 * 
 * This module contains pure functions for simulating financial growth over time.
 * It does not use Firestore or external APIs.
 */

export interface SimulationInput {
  income: number;
  expenses: number;
  assets: number;
  liabilities: number;
  years: number;
}

export interface YearlyResult {
  year: number;
  income: number;
  expenses: number;
  investment: number;
  debt: number;
  netWorth: number;
  savings: number;
}

/**
 * Constants for simulation assumptions
 */
const INCOME_GROWTH_RATE = 0.06;
const INVESTMENT_RETURN_RATE = 0.10;
const INFLATION_RATE = 0.05;
const DEBT_REDUCTION_RATE = 0.10;

/**
 * simulateFinancialLife(input)
 * 
 * Simulates financial progression over a specified number of years.
 */
export const simulateFinancialLife = (input: SimulationInput): YearlyResult[] => {
  const { income, expenses, assets, liabilities, years } = input;
  
  const timeline: YearlyResult[] = [];
  
  let currentIncome = income;
  let currentExpenses = expenses;
  let investment = assets;
  let debt = liabilities;

  // Initial state (Year 0)
  timeline.push({
    year: 0,
    income: currentIncome,
    expenses: currentExpenses,
    investment: investment,
    debt: debt,
    netWorth: investment - debt,
    savings: 0
  });

  for (let i = 1; i <= years; i++) {
    // 1. Increase income
    currentIncome *= (1 + INCOME_GROWTH_RATE);
    
    // 2. Increase expenses (inflation)
    currentExpenses *= (1 + INFLATION_RATE);
    
    // 3. Calculate yearly savings
    const savings = currentIncome - currentExpenses;
    
    // 4. Add savings to investment
    investment += savings;
    
    // 5. Grow investment
    investment *= (1 + INVESTMENT_RETURN_RATE);
    
    // 6. Reduce debt (simple model: 10% reduction per year)
    debt *= (1 - DEBT_REDUCTION_RATE);
    
    // 7. Calculate net worth
    const netWorth = investment - debt;
    
    // 8. Store result in array
    timeline.push({
      year: i,
      income: currentIncome,
      expenses: currentExpenses,
      investment: investment,
      debt: debt,
      netWorth: netWorth,
      savings: savings
    });
  }

  return timeline;
};

/**
 * Test Case (Internal Documentation)
 * 
 * Input:
 * income = 600000
 * expenses = 300000
 * assets = 500000
 * liabilities = 200000
 * years = 10
 */
