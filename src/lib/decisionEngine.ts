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

  // 3. Calculate savings rate
  const inc = Number(income) || 0;
  const exp = Number(expenses) || 0;
  const liab = Number(liabilities) || 0;
  const savings = inc - exp;
  const savingsRate = inc > 0 ? savings / inc : 0;

  const recommendations: string[] = [];
  const warnings: string[] = [];

  // 4. Generate intelligent recommendations based on savings rate
  if (savingsRate < 0.2) {
    recommendations.push("Focus on reducing unnecessary expenses to boost your savings rate above the 20% threshold.");
    warnings.push("Your savings rate is below 20%. A higher safety margin is recommended for long-term stability.");
  } else if (savingsRate >= 0.2 && savingsRate <= 0.4) {
    recommendations.push("Your savings are healthy. Focus on optimizing your investment portfolio for better risk-adjusted returns.");
  } else {
    recommendations.push("Excellent savings rate! Consider increasing your monthly investment contributions to accelerate your path to financial freedom.");
  }

  // 5. Identify best scenario for UI display (Highest Impact)
  const best = scenarios.reduce((prev, current) => (Number(prev.value) > Number(current.value)) ? prev : current);
  
  const base = scenarios.find(s => s.name === "Base") || { name: "Base", value: 0 };
  const improvement = (Number(best.value) || 0) - (Number(base.value) || 0);

  // 6. Additional Warnings - Debt ratio
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
