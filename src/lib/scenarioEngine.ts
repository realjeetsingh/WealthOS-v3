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
 * Compares three scenarios:
 * 1. Base: Original input
 * 2. Invest More: Increase initial savings by 10% (by increasing income)
 * 3. Reduce Expenses: Reduce initial expenses by 10%
 */
export const compareScenarios = (baseInput: SimulationInput): ScenarioResult[] => {
  const results: ScenarioResult[] = [];

  // 1. Scenario A — Base
  const baseTimeline = simulateFinancialLife(baseInput);
  const baseFinalNetWorth = Number(baseTimeline[baseTimeline.length - 1].netWorth) || 0;
  results.push({ name: "Base", value: isNaN(baseFinalNetWorth) ? 0 : baseFinalNetWorth });

  // 2. Scenario B — Invest More (Increase savings by 10%)
  const inc = Number(baseInput.income) || 0;
  const exp = Number(baseInput.expenses) || 0;
  const currentSavings = inc - exp;
  const targetSavings = currentSavings * 1.1;
  const investMoreInput: SimulationInput = {
    ...baseInput,
    income: exp + targetSavings
  };
  const investMoreTimeline = simulateFinancialLife(investMoreInput);
  const investMoreFinalNetWorth = Number(investMoreTimeline[investMoreTimeline.length - 1].netWorth) || 0;
  results.push({ name: "Invest More", value: isNaN(investMoreFinalNetWorth) ? 0 : investMoreFinalNetWorth });

  // 3. Scenario C — Reduce Expenses (Reduce expenses by 10%)
  const reduceExpensesInput: SimulationInput = {
    ...baseInput,
    expenses: exp * 0.9
  };
  const reduceExpensesTimeline = simulateFinancialLife(reduceExpensesInput);
  const reduceExpensesFinalNetWorth = Number(reduceExpensesTimeline[reduceExpensesTimeline.length - 1].netWorth) || 0;
  results.push({ name: "Reduce Expenses", value: isNaN(reduceExpensesFinalNetWorth) ? 0 : reduceExpensesFinalNetWorth });

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
