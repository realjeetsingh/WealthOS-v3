import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { trackEvent, reportError, AnalyticsEvents } from "./analytics";

export interface SmartFinancialInsight {
  type: "risk" | "warning" | "optimization";
  problem: string;
  impact: string;
  fix: string;
  action: {
    label: string;
    path: string;
  };
}

export interface SmartFinancialAnalysis {
  projectedNetWorth: number;
  confidenceScore: number;
  confidenceReason: string;
  keyInsights: SmartFinancialInsight[];
  strategicPlan: {
    shortTerm: string[];
    longTerm: string[];
  };
  riskAssessment: string;
  futureScenarios: {
    optimistic: string;
    conservative: string;
  };
  suggestedModule: {
    name: string;
    path: string;
    label: string;
  };
}

export type SmartFinancialAnalysisResponse = 
  | SmartFinancialAnalysis 
  | { status: "failed"; message: string; type: "insufficient_data" | "error" };

export function isSmartFinancialAnalysis(response: SmartFinancialAnalysisResponse): response is SmartFinancialAnalysis {
  return !('status' in response);
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export interface AIChatResponse {
  problemSummary: string;
  keyInsight: string;
  actionSteps: string[];
  projection?: string;
  suggestedModule?: {
    name: string;
    path: string;
  };
}

export const generateChatResponse = async (
  query: string,
  history: ChatMessage[],
  context: {
    netWorth: number;
    income: number;
    expenses: number;
    loans: any[];
    goals: any[];
    healthSummary: {
      state: string;
      stateLabel: string;
      stateDescription: string;
    };
    userProfile?: any;
  }
): Promise<AIChatResponse | string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const systemInstruction = `
    You are a world-class AI Financial Assistant. Your goal is to provide personalized, actionable financial advice based on the user's specific data.
    
    USER FINANCIAL CONTEXT:
    - Name: ${context.userProfile?.fullName || 'User'}
    - Current Net Worth: ₹${context.netWorth}
    - Monthly Income: ₹${context.income}
    - Monthly Expenses: ₹${context.expenses}
    - Financial State: ${context.healthSummary.stateLabel} (${context.healthSummary.stateDescription})
    - Active Goals: ${JSON.stringify(context.goals.map(g => ({ title: g.name, target: g.targetAmount, current: g.currentAmount })))}
    - Active Loans: ${JSON.stringify(context.loans.map(l => ({ name: l.name, emi: l.emi, remaining: l.remainingAmount })))}
    
    RESPONSE GUIDELINES:
    1. If the user asks a general question, use their context to make it specific.
    2. If there is insufficient data (e.g., income/expenses are 0), honestly state: "I need more data about your income/expenses to give accurate advice."
    3. For financial advice, your response MUST be a raw JSON object string ONLY. DO NOT include markdown code blocks like \`\`\`json ... \`\`\`.
    4. The JSON must have these fields:
       - problemSummary: Short summary of the identified issue.
       - keyInsight: The core "aha!" moment for the user.
       - actionSteps: An array of 3-4 concrete steps.
       - projection: (Optional) A potential future outcome if steps are followed.
       - suggestedModule: (Optional) { name: string, path: string } to direct the user.
    5. If the user is just chatting or asking a non-financial question, respond with a simple string.
    6. Always be encouraging but realistic. All currency in INR (₹).
  `;

  try {
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction,
      },
      history: history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }))
    });
    
    trackEvent(AnalyticsEvents.AI_CHAT_REQUEST, { query });

    const result = await chat.sendMessage({
      message: query,
    });

    let text = result.text;
    
    // Clean up text if it contains markdown code blocks
    if (text.includes("```")) {
      text = text.replace(/```json\n?|```\n?/g, "").trim();
    }
    
    // Try to parse as JSON if it looks like JSON or contains JSON-like structure
    const trimmedText = text.trim();
    if (trimmedText.startsWith("{") && trimmedText.endsWith("}")) {
      try {
        return JSON.parse(trimmedText) as AIChatResponse;
      } catch (e) {
        return text;
      }
    }
    
    return text;
  } catch (error) {
    console.error("Chat AI Error:", error);
    reportError(error, "GeminiService:generateChatResponse");
    trackEvent(AnalyticsEvents.AI_CHAT_RESPONSE_FAILURE);
    return "I'm having trouble connecting to my financial brain right now. Please try again in a moment.";
  }
};
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
    1. Act as a "Decision Engine" for the user's finances.
    2. Analyze the data to find 3-5 critical insights.
    3. Every insight MUST include "Data Proof": actual numbers, comparisons, and calculations from the provided data.
    
    CONFIDENCE SCORE CALCULATION:
    - Base: 40%
    - +20% if monthly income is provided (>0)
    - +20% if monthly expenses are provided (>0)
    - +20% if more than 10 transactions are provided.
    - Max: 100%.
    - Provide a "confidenceReason" explaining why the score is what it is (e.g., "High score due to complete transaction history and income data").

    INSIGHT STRUCTURE:
    - type: "risk" (critical/danger), "warning" (caution), or "optimization" (growth).
    - problem: A clear statement of the issue with data proof (e.g., "Expenses ₹43K > Income ₹40K").
    - impact: The financial consequence (e.g., "₹3K monthly deficit leads to ₹3.6L debt in 10 years").
    - fix: A concrete, actionable step to resolve it.
    - action: A button label (e.g., "Fix this now") and the app path (e.g., "/budgets").

    PRIORITIZATION:
    - Sort keyInsights by: 1. Risk, 2. Warning, 3. Optimization.

    CRITICAL INSTRUCTIONS:
    - DO NOT perform any new financial calculations for projections. Use the provided ones.
    - DO NOT hallucinate numbers. Use the exact numbers from the prompt.
    - All currency values MUST be in Indian Rupees (INR).
    - Output MUST be a valid JSON object matching the requested schema.
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
              description: "The 10-year base projection provided in the prompt."
            },
            confidenceScore: { 
              type: Type.NUMBER, 
              description: "Confidence score from 0 to 100 based on data quality."
            },
            confidenceReason: {
              type: Type.STRING,
              description: "Reasoning for the confidence score."
            },
            keyInsights: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ["risk", "warning", "optimization"] },
                  problem: { type: Type.STRING },
                  impact: { type: Type.STRING },
                  fix: { type: Type.STRING },
                  action: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      path: { type: Type.STRING }
                    },
                    required: ["label", "path"]
                  }
                },
                required: ["type", "problem", "impact", "fix", "action"]
              },
              description: "3-5 prioritized insights with data proof."
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
            suggestedModule: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "The name of the module (e.g., Budgets, Portfolio, Goals)." },
                path: { type: Type.STRING, description: "The app path (e.g., /budgets, /portfolio, /goals)." },
                label: { type: Type.STRING, description: "A short label for the action button (e.g., Manage Budgets)." },
              },
              required: ["name", "path", "label"],
            },
          },
          required: ["projectedNetWorth", "confidenceScore", "keyInsights", "strategicPlan", "riskAssessment", "futureScenarios", "suggestedModule"],
        },
      },
    });

    if (!response.text) {
      return { status: "failed", message: "We need more data to generate a detailed analysis", type: "insufficient_data" };
    }

    const result = JSON.parse(response.text);
    trackEvent('smart_analysis_success', { score: result.confidenceScore });
    return result as SmartFinancialAnalysis;
  } catch (error) {
    console.error("AI Service Failure:", error);
    reportError(error, "GeminiService:getSmartFinancialAnalysis");
    trackEvent(AnalyticsEvents.AI_CHAT_RESPONSE_FAILURE, { type: 'smart_analysis' });
    return { status: "failed", message: "We need more data to generate a detailed analysis", type: "insufficient_data" };
  }
};

