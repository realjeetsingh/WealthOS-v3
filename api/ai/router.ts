import { Router, Request, Response } from 'express';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { config } from '../shared/env';

const router = Router();

// Lazy initialization of Gemini client
const getGeminiClient = (): GoogleGenAI | null => {
  const apiKey = config.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  } catch (error) {
    console.error("[AI] Failed to initialize Gemini SDK:", error);
    return null;
  }
};

// POST /api/ai/chat
router.post('/chat', async (req: Request, res: Response) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: "Gemini AI service is not configured on the server." });
  }

  const { query, history = [], systemInstruction } = req.body;
  if (!query) {
    return res.status(400).json({ error: "Query parameter is required" });
  }

  try {
    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction,
      },
      history: history.map((msg: any) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      }))
    });

    const result = await chat.sendMessage({
      message: query
    });

    return res.json({ text: result.text });
  } catch (error: any) {
    console.error("[AI] Chat execution failed:", error);
    return res.status(500).json({ error: error.message || "AI Chat failed to respond" });
  }
});

// POST /api/ai/analyze
router.post('/analyze', async (req: Request, res: Response) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(530).json({ error: "Gemini AI service is not configured on the server." });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required for analysis" });
  }

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
      }
    });

    return res.json({ text: result.text });
  } catch (error: any) {
    console.error("[AI] Analysis execution failed:", error);
    return res.status(500).json({ error: error.message || "AI Analysis failed to generate output" });
  }
});

export default router;
