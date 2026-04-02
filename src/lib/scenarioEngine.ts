/**
 * Scenario Comparison Engine
 * 
 * This module compares different financial scenarios using the simulation engine.
 * It does not use Firestore or external APIs.
 */

import { SimulationInput } from './simulationEngine';

export interface ScenarioResult {
  name: string;
  value: number;
}

/**
 * compareScenarios(baseInput)
 * 
 * Compares 1-year impacts of three strategies:
 * 1. Reduce Expenses: Reduce monthly expenses by 10%
 * 2. Increase Income: Increase monthly income by 10%
 * 3. Invest Surplus: 10% return on annual savings
 */
export const compareScenarios = (baseInput: SimulationInput): ScenarioResult[] => {
  const income = Number(baseInput.income) || 0;
  const expenses = Number(baseInput.expenses) || 0;
  const cashflow = income - expenses;
  const annualSavings = cashflow * 12;

  const results: ScenarioResult[] = [];

  // Base is 0 impact (Current Path)
  results.push({ name: "Base", value: 0 });

  // Strategy 1 — Reduce Expenses (10% reduction)
  const expenseReduction = expenses * 0.10;
  results.push({ name: "Reduce Expenses", value: expenseReduction * 12 });

  // Strategy 2 — Increase Income (10% increase)
  const incomeIncrease = income * 0.10;
  results.push({ name: "Increase Income", value: incomeIncrease * 12 });

  // Strategy 3 — Invest Surplus (10% return on annual savings)
  const investmentImpact = Math.max(0, annualSavings * 0.10);
  results.push({ name: "Invest Surplus", value: investmentImpact });

  return results;
};

/**
 * Sample Data Test (Internal Documentation)
 * 
 * baseInput:
 * income = 600000
 * expenses = 300000
 * assets = 500000
 * liabilities = 200000
 * years = 10
 * 
 * Expected:
 * Base: ~X
 * Invest More: >X
 * Reduce Expenses: >X
 */
