import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

export interface SmartFinancialAnalysis {
  projectedNetWorth: number;
  confidenceScore: number;
  keyInsights: string[];
  strategicPlan: {
    shortTerm: string[];
    longTerm: string[];
  };
  riskAssessment: string;
  futureScenarios: {
    optimistic: string;
    conservative: string;
  };
}

export const getSmartFinancialAnalysis = async (data: {
  income: number;
  expenses: number;
  assets: number;
  liabilities: number;
  transactions: any[];
  userProfile?: any;
  systemCalculations: {
    currentNetWorth: number;
    projectedNetWorthBase: number;
    scenarios: any[];
  };
}): Promise<SmartFinancialAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `
    You are a world-class financial advisor. Analyze the following financial data for a user named ${data.userProfile?.name || 'User'}.
    
    Financial Context (all values in Indian Rupees - INR):
    - Monthly Income: ${data.income}
    - Monthly Expenses: ${data.expenses}
    - Total Assets: ${data.assets}
    - Total Liabilities: ${data.liabilities}
    - Recent Transactions: ${JSON.stringify(data.transactions.slice(0, 10))}
    
    System Calculations (Reference these for accuracy):
    - Current Net Worth: ${data.systemCalculations.currentNetWorth}
    - System Projected Net Worth (10y Base): ${data.systemCalculations.projectedNetWorthBase}
    - Simulation Scenarios: ${JSON.stringify(data.systemCalculations.scenarios)}
    
    CRITICAL INSTRUCTION:
    Do not generate projections that contradict the provided system calculations. Stay within a realistic range based on the provided simulation results. Your analysis should enhance and explain these numbers, not override them.
    
    Provide a comprehensive "Smart Analysis" of their financial future over the next 10 years in Indian Rupees (INR).
    Be realistic, data-driven, and provide actionable strategic advice.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          projectedNetWorth: { 
            type: Type.NUMBER,
            description: "Estimated net worth in 10 years in INR based on current trajectory."
          },
          confidenceScore: { 
            type: Type.NUMBER, 
            description: "Confidence in this projection from 0 to 100."
          },
          keyInsights: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Top 3-5 critical observations about their current financial health."
          },
          strategicPlan: {
            type: Type.OBJECT,
            properties: {
              shortTerm: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Immediate actions for the next 6-12 months."
              },
              longTerm: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Strategic goals for the next 5-10 years."
              },
            },
            required: ["shortTerm", "longTerm"],
          },
          riskAssessment: { 
            type: Type.STRING,
            description: "Analysis of potential financial risks (e.g., inflation, debt, lack of diversification)."
          },
          futureScenarios: {
            type: Type.OBJECT,
            properties: {
              optimistic: { 
                type: Type.STRING,
                description: "What happens if they maximize savings and investments."
              },
              conservative: { 
                type: Type.STRING,
                description: "What happens if they maintain current habits or face minor setbacks."
              },
            },
            required: ["optimistic", "conservative"],
          },
        },
        required: ["projectedNetWorth", "confidenceScore", "keyInsights", "strategicPlan", "riskAssessment", "futureScenarios"],
      },
    },
  });

  if (!response.text) {
    throw new Error("Failed to generate smart analysis");
  }

  return JSON.parse(response.text);
};
