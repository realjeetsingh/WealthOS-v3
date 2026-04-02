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

export type SmartFinancialAnalysisResponse = 
  | SmartFinancialAnalysis 
  | { status: "failed"; message: string; type: "insufficient_data" | "error" };

export function isSmartFinancialAnalysis(response: SmartFinancialAnalysisResponse): response is SmartFinancialAnalysis {
  return !('status' in response);
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
    projectedNetWorthOptimized: number;
    financialImpact: number;
    scenarios: any[];
  };
}): Promise<SmartFinancialAnalysisResponse> => {
  // PART 4 — VALIDATION LAYER (VERY IMPORTANT)
  // Insights should be generated if ANY of the following are true:
  // income > 0 OR transactions exist OR assets > 0
  const hasAnyData = data.income > 0 || (data.transactions && data.transactions.length > 0) || data.assets > 0;

  if (!hasAnyData) {
    return { 
      status: "failed", 
      message: "Add more financial data to unlock insights",
      type: "insufficient_data"
    };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  // PART 5 — FIX AI PROMPT ROLE
  const prompt = `
    You are a world-class financial advisor. Analyze the following financial data for a user named ${data.userProfile?.name || 'User'}.
    
    Financial Context (STRICTLY in Indian Rupees - INR):
    - Monthly Income: ${data.income} INR
    - Monthly Expenses: ${data.expenses} INR
    - Total Assets: ${data.assets} INR
    - Total Liabilities: ${data.liabilities} INR
    - Recent Transactions: ${JSON.stringify(data.transactions.slice(0, 15))}
    
    Deterministic Projections (Already calculated, use these for your analysis):
    - Current Net Worth: ${data.systemCalculations.currentNetWorth} INR
    - 10-Year Base Projection (Current Path): ${data.systemCalculations.projectedNetWorthBase} INR
    - 10-Year Optimized Projection (With Strategy): ${data.systemCalculations.projectedNetWorthOptimized} INR
    - Potential Financial Impact of Optimization: ${data.systemCalculations.financialImpact} INR
    
    YOUR ROLE:
    1. Explain the numbers above in simple, human terms.
    2. Provide insights on how they can achieve the "Optimized Projection".
    3. Identify risks in their current financial behavior based on their transactions.
    4. Suggest specific strategies to maximize their wealth.
    
    CRITICAL INSTRUCTIONS:
    - DO NOT perform any new financial calculations. Use the provided projections.
    - DO NOT hallucinate numbers. Stick to the deterministic projections provided.
    - All currency values MUST be in Indian Rupees (INR).
    - Output MUST be a valid JSON object matching the requested schema.
    - Focus on explaining the "Impact" which is the difference between the Optimized and Base projections.
  `;

  try {
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
              description: "The 10-year base projection provided in the prompt. Do not recalculate."
            },
            confidenceScore: { 
              type: Type.NUMBER, 
              description: "Confidence in the provided data and analysis from 0 to 100."
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
                  description: "Explanation of the Optimized Projection path."
                },
                conservative: { 
                  type: Type.STRING,
                  description: "Explanation of the Base Projection path."
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
      return { status: "failed", message: "We need more data to generate a detailed analysis", type: "insufficient_data" };
    }

    const result = JSON.parse(response.text);
    return result as SmartFinancialAnalysis;
  } catch (error) {
    console.error("AI Service Failure:", error);
    return { status: "failed", message: "We need more data to generate a detailed analysis", type: "insufficient_data" };
  }
};

