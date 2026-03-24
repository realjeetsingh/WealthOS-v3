/**
 * Financial Decision Engine
 * 
 * This module provides deterministic financial advice based on scenario comparisons
 * and current financial metrics. It uses pure logic and no AI models.
 */

export interface Scenario {
  name: string;
  value: number;
}

export interface DecisionInput {
  scenarios: Scenario[];
  income: number;
  expenses: number;
  liabilities: number;
}

export interface FinancialAdvice {
  bestScenario: string;
  improvement: number;
  recommendations: string[];
  warnings: string[];
}

/**
 * generateFinancialAdvice(input)
 * 
 * Analyzes financial scenarios and metrics to provide actionable recommendations.
 */
export const generateFinancialAdvice = (input: DecisionInput): FinancialAdvice => {
  const { scenarios, income, expenses, liabilities } = input;

  if (!scenarios || scenarios.length === 0) {
    throw new Error("Scenarios are required for financial advice generation.");
  }

  // 1. Identify best scenario (highest final net worth)
  const best = scenarios.reduce((prev, current) => (Number(prev.value) > Number(current.value)) ? prev : current);
  const base = scenarios.find(s => s.name === "Base") || scenarios[0];

  // 2. Calculate improvement (best - base)
  const improvement = (Number(best.value) || 0) - (Number(base.value) || 0);

  const recommendations: string[] = [];
  const warnings: string[] = [];

  // 3. Generate recommendations
  if (best.name === "Invest More") {
    recommendations.push("Increase monthly investments to maximize long-term compounding.");
  } else if (best.name === "Reduce Expenses") {
    recommendations.push("Focus on reducing unnecessary expenses to boost your savings rate.");
  } else if (best.name === "Base") {
    recommendations.push("Your current financial path is solid. Maintain your current habits.");
  }

  // 4. Warnings - Savings rate
  const inc = Number(income) || 0;
  const exp = Number(expenses) || 0;
  const liab = Number(liabilities) || 0;
  
  const savings = inc - exp;
  const savingsRate = inc > 0 ? savings / inc : 0;

  if (savingsRate < 0.2) {
    warnings.push("Your savings rate is below 20%. Consider reviewing your budget to increase your safety margin.");
  }

  // 5. Warnings - Debt ratio
  if (liab > inc * 12) {
    warnings.push("High debt level detected (liabilities exceed 100% of annual income). Prioritize debt repayment.");
  }

  return {
    bestScenario: best.name,
    improvement: isNaN(improvement) ? 0 : improvement,
    recommendations,
    warnings
  };
};
