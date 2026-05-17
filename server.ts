import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import crypto from "crypto";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Configurations
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const FINNHUB_API_KEY = process.env.VITE_FINNHUB_API_KEY || process.env.FINNHUB_API_KEY;
const CMC_API_KEY = process.env.COINMARKETCAP_API_KEY;
const RAZORPAY_KEY_ID = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize SDKs
const razorpay = (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) 
  ? new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET })
  : null;

const genAI = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

// Server-side cache
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute server-side cache

app.use(express.json());

// --- MARKET DATA PROXY ---

app.get("/api/market/crypto/quote", async (req, res) => {
  const { symbol } = req.query; // Symbol like 'BTC,ETH' or 'BTC'
  if (!symbol) return res.status(400).json({ error: "Symbol parameter is required" });

  const cacheKey = `crypto_v2_${symbol}`;
  if (cache.has(cacheKey)) {
    const { data, timestamp } = cache.get(cacheKey);
    if (Date.now() - timestamp < CACHE_TTL) return res.json(data);
  }

  const symbols = symbol.toString().toUpperCase().split(',');

  // PRIMARY: COINMARKETCAP
  if (CMC_API_KEY && CMC_API_KEY.trim() !== "") {
    try {
      const response = await axios.get(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest`, {
        params: { symbol: symbols.join(',') },
        headers: { 'X-CMC_PRO_API_KEY': CMC_API_KEY },
        timeout: 5000
      });
      
      const transformedData: any = {};
      const cmcData = response.data?.data || {};
      
      symbols.forEach(s => {
        const coin = cmcData[s];
        if (coin) {
          transformedData[s.toLowerCase()] = {
            usd: coin.quote?.USD?.price,
            percent_change_24h: coin.quote?.USD?.percent_change_24h,
            source: 'cmc'
          };
        }
      });

      if (Object.keys(transformedData).length > 0) {
        cache.set(cacheKey, { data: transformedData, timestamp: Date.now() });
        return res.json(transformedData);
      }
    } catch (error: any) {
      console.error(`WealthOS Market: CMC Fetch Error [${symbol}]:`, error.response?.data || error.message);
    }
  }

  // SECONDARY: COINGECKO FALLBACK
  try {
    // Map common symbols to CoinGecko IDs for more reliable fallback
    const cgIds = symbols.map(s => {
      const map: { [key: string]: string } = {
        'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana', 'USDT': 'tether',
        'BNB': 'binancecoin', 'XRP': 'ripple', 'ADA': 'cardano', 'AVAX': 'avalanche-2',
        'DOGE': 'dogecoin', 'DOT': 'polkadot', 'MATIC': 'polygon'
      };
      return map[s] || s.toLowerCase();
    }).join(',');

    const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
      params: { 
        ids: cgIds, 
        vs_currencies: 'usd',
        include_24hr_change: 'true'
      },
      timeout: 5000
    });

    const transformedData: any = {};
    const cgData = response.data || {};
    
    symbols.forEach(s => {
      const cgId = s === 'BTC' ? 'bitcoin' : (s === 'ETH' ? 'ethereum' : (s === 'SOL' ? 'solana' : (s === 'USDT' ? 'tether' : s.toLowerCase())));
      if (cgData[cgId]) {
        transformedData[s.toLowerCase()] = {
          usd: cgData[cgId].usd,
          percent_change_24h: cgData[cgId].usd_24h_change,
          source: 'coingecko'
        };
      }
    });

    if (Object.keys(transformedData).length > 0) {
      cache.set(cacheKey, { data: transformedData, timestamp: Date.now() });
      return res.json(transformedData);
    }
    
    res.status(404).json({ error: "Crypto not found in any provider" });
  } catch (error: any) {
    console.error(`WealthOS Market: Crypto Proxy Critical Failure [${symbol}]:`, error.message);
    res.status(500).json({ error: "Market data providers unavailable", detail: error.message });
  }
});

app.get("/api/market/crypto/search", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Search query is required" });

  try {
    const response = await axios.get(`https://api.coingecko.com/api/v3/search`, {
      params: { query: q },
      timeout: 5000
    });

    const results = (response.data.coins || []).slice(0, 10).map((coin: any) => ({
      symbol: coin.symbol.toUpperCase(),
      description: coin.name,
      type: 'Crypto',
      id: coin.id,
      thumb: coin.large
    }));

    res.json({ result: results }); // Keep structure similar to Finnhub proxy for easier consumer handling
  } catch (error: any) {
    console.error(`WealthOS Market: Crypto Search Error [${q}]:`, error.message);
    res.status(500).json({ error: "Crypto search unavailable" });
  }
});

app.get("/api/market/search", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Query parameter 'q' is required" });

  const cacheKey = `search_${q}`;
  if (cache.has(cacheKey)) {
    const { data, timestamp } = cache.get(cacheKey);
    if (Date.now() - timestamp < CACHE_TTL) return res.json(data);
  }

  if (!FINNHUB_API_KEY) return res.status(500).json({ error: "Market API not configured" });

  try {
    const response = await axios.get(`${FINNHUB_BASE_URL}/search`, {
      params: { q, token: FINNHUB_API_KEY },
      timeout: 5000
    });
    cache.set(cacheKey, { data: response.data, timestamp: Date.now() });
    res.json(response.data);
  } catch (error: any) {
    console.error(`Finnhub Search Error for ${q}:`, error.response?.data || error.message);
    const status = error.response?.status || 500;
    const detail = error.response?.data?.error || error.message;
    res.status(status).json({ error: detail, type: status === 429 ? 'RATE_LIMIT' : 'API_FAILURE' });
  }
});

app.get("/api/market/quote", async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: "Symbol parameter is required" });

  const cacheKey = `quote_${symbol}`;
  if (cache.has(cacheKey)) {
    const { data, timestamp } = cache.get(cacheKey);
    if (Date.now() - timestamp < CACHE_TTL) return res.json(data);
  }

  if (!FINNHUB_API_KEY) return res.status(500).json({ error: "Market API not configured" });

  try {
    const response = await axios.get(`${FINNHUB_BASE_URL}/quote`, {
      params: { symbol, token: FINNHUB_API_KEY },
      timeout: 5000
    });
    cache.set(cacheKey, { data: response.data, timestamp: Date.now() });
    res.json(response.data);
  } catch (error: any) {
    console.error(`Finnhub Quote Error for ${symbol}:`, error.response?.data || error.message);
    const status = error.response?.status || 500;
    const detail = error.response?.data?.error || error.message;
    res.status(status).json({ error: detail, type: status === 429 ? 'RATE_LIMIT' : 'API_FAILURE' });
  }
});

// --- PAYMENTS (RAZORPAY) ---

app.post("/api/payments/create-order", async (req, res) => {
  if (!razorpay) return res.status(500).json({ error: "Payments not configured" });
  
  try {
    const options = {
      amount: 29900, // ₹299 fixed for Premium
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error: any) {
    console.error("Razorpay Order Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/payments/verify", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!RAZORPAY_KEY_SECRET) return res.status(500).json({ error: "Payments not configured" });

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    res.json({ status: "ok", message: "Payment verified" });
  } else {
    res.status(400).json({ status: "failed", message: "Invalid signature" });
  }
});

// --- AI (GEMINI) ---

app.post("/api/ai/chat", async (req, res) => {
  if (!genAI) return res.status(500).json({ error: "AI not configured" });
  
  const { query, history, systemInstruction } = req.body;
  
  try {
    const chat = genAI.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction,
      },
      history: history.map((msg: any) => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }))
    });
    
    const result = await chat.sendMessage({
      message: query,
    });
    
    res.json({ text: result.text });
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/analyze", async (req, res) => {
  if (!genAI) return res.status(500).json({ error: "AI not configured" });
  
  const { prompt } = req.body;
  
  try {
    const result = await genAI.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      },
    });
    
    res.json({ text: result.text });
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`WealthOS Server running at http://localhost:${PORT}`);
  });
}

startServer();
