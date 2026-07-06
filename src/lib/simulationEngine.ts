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
  investmentReturnRate?: number;
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
const DEFAULT_INVESTMENT_RETURN_RATE = 0.10;
const INFLATION_RATE = 0.05;
const DEBT_REDUCTION_RATE = 0.10;

/**
 * simulateFinancialLife(input)
 * 
 * Simulates financial progression over a specified number of years.
 */
export const simulateFinancialLife = (input: SimulationInput): YearlyResult[] => {
  let { income, expenses, assets, liabilities, years, investmentReturnRate } = input;
  
  // Step 3: Sanitize inputs
  income = Number(income) || 0;
  expenses = Number(expenses) || 0;
  assets = Number(assets) || 0;
  liabilities = Number(liabilities) || 0;
  years = Number(years) || 0;
  const returnRate = Number(investmentReturnRate) || DEFAULT_INVESTMENT_RETURN_RATE;

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
    netWorth: isNaN(investment - debt) ? 0 : (investment - debt),
    savings: 0
  });

  for (let i = 1; i <= years; i++) {
    // 1. Increase income (yearly)
    currentIncome *= (1 + INCOME_GROWTH_RATE);
    
    // 2. Increase expenses (inflation, yearly)
    currentExpenses *= (1 + INFLATION_RATE);
    
    // 3. Calculate monthly savings for this year
    const yearlySavings = currentIncome - currentExpenses;
    const monthlySavings = yearlySavings / 12;
    const monthlyReturnRate = returnRate / 12;
    
    // 4. Monthly compounding for this year
    for (let m = 1; m <= 12; m++) {
      // Add monthly savings and grow
      investment += monthlySavings;
      investment *= (1 + monthlyReturnRate);
    }
    
    // 5. Reduce debt (simple model: 10% reduction per year)
    debt *= (1 - DEBT_REDUCTION_RATE);
    
    // 6. Calculate net worth
    const netWorth = isNaN(investment - debt) ? 0 : (investment - debt);
    
    // 7. Store result in array
    timeline.push({
      year: i,
      income: isNaN(currentIncome) ? 0 : currentIncome,
      expenses: isNaN(currentExpenses) ? 0 : currentExpenses,
      investment: isNaN(investment) ? 0 : investment,
      debt: isNaN(debt) ? 0 : debt,
      netWorth: netWorth,
      savings: isNaN(yearlySavings) ? 0 : yearlySavings
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
