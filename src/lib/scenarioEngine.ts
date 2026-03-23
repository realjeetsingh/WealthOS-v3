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
  const baseFinalNetWorth = baseTimeline[baseTimeline.length - 1].netWorth;
  results.push({ name: "Base", value: baseFinalNetWorth });

  // 2. Scenario B — Invest More (Increase savings by 10%)
  // savings = income - expenses
  // targetSavings = savings * 1.1
  // newIncome = expenses + targetSavings
  const currentSavings = baseInput.income - baseInput.expenses;
  const targetSavings = currentSavings * 1.1;
  const investMoreInput: SimulationInput = {
    ...baseInput,
    income: baseInput.expenses + targetSavings
  };
  const investMoreTimeline = simulateFinancialLife(investMoreInput);
  const investMoreFinalNetWorth = investMoreTimeline[investMoreTimeline.length - 1].netWorth;
  results.push({ name: "Invest More", value: investMoreFinalNetWorth });

  // 3. Scenario C — Reduce Expenses (Reduce expenses by 10%)
  const reduceExpensesInput: SimulationInput = {
    ...baseInput,
    expenses: baseInput.expenses * 0.9
  };
  const reduceExpensesTimeline = simulateFinancialLife(reduceExpensesInput);
  const reduceExpensesFinalNetWorth = reduceExpensesTimeline[reduceExpensesTimeline.length - 1].netWorth;
  results.push({ name: "Reduce Expenses", value: reduceExpensesFinalNetWorth });

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
