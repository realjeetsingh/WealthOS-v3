/**
 * Scenario Comparison Engine
 * 
 * This module compares different financial scenarios using the simulation engine.
 * It does not use Firestore or external APIs.
 */

import { simulateFinancialLife, SimulationInput } from './simulationEngine';

export interface ScenarioResult {
  name: string;
  value: number;
}

/**
 * compareScenarios(baseInput)
 * 
 * Compares four scenarios:
 * 1. Base: Original input
 * 2. Reduce Expenses: Reduce initial expenses by 10%
 * 3. Optimize Investments: Increase investment return rate from 10% to 12%
 * 4. Increase Investments: Increase savings by 20% (by increasing income)
 */
export const compareScenarios = (baseInput: SimulationInput): ScenarioResult[] => {
  const results: ScenarioResult[] = [];

  // 1. Scenario A — Base
  const baseTimeline = simulateFinancialLife(baseInput);
  const baseFinalNetWorth = Number(baseTimeline[baseTimeline.length - 1].netWorth) || 0;
  results.push({ name: "Base", value: isNaN(baseFinalNetWorth) ? 0 : baseFinalNetWorth });

  // 2. Scenario B — Reduce Expenses (Reduce expenses by 10%)
  const exp = Number(baseInput.expenses) || 0;
  const reduceExpensesInput: SimulationInput = {
    ...baseInput,
    expenses: exp * 0.9
  };
  const reduceExpensesTimeline = simulateFinancialLife(reduceExpensesInput);
  const reduceExpensesFinalNetWorth = Number(reduceExpensesTimeline[reduceExpensesTimeline.length - 1].netWorth) || 0;
  results.push({ name: "Reduce Expenses", value: isNaN(reduceExpensesFinalNetWorth) ? 0 : reduceExpensesFinalNetWorth });

  // 3. Scenario C — Optimize Investments (Increase return rate to 12%)
  const optimizeInvestmentsInput: SimulationInput = {
    ...baseInput,
    investmentReturnRate: 0.12
  };
  const optimizeInvestmentsTimeline = simulateFinancialLife(optimizeInvestmentsInput);
  const optimizeInvestmentsFinalNetWorth = Number(optimizeInvestmentsTimeline[optimizeInvestmentsTimeline.length - 1].netWorth) || 0;
  results.push({ name: "Optimize Investments", value: isNaN(optimizeInvestmentsFinalNetWorth) ? 0 : optimizeInvestmentsFinalNetWorth });

  // 4. Scenario D — Increase Investments (Increase savings by 20%)
  const inc = Number(baseInput.income) || 0;
  const currentSavings = inc - exp;
  const targetSavings = currentSavings * 1.2;
  const increaseInvestmentsInput: SimulationInput = {
    ...baseInput,
    income: exp + targetSavings
  };
  const increaseInvestmentsTimeline = simulateFinancialLife(increaseInvestmentsInput);
  const increaseInvestmentsFinalNetWorth = Number(increaseInvestmentsTimeline[increaseInvestmentsTimeline.length - 1].netWorth) || 0;
  results.push({ name: "Increase Investments", value: isNaN(increaseInvestmentsFinalNetWorth) ? 0 : increaseInvestmentsFinalNetWorth });

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
