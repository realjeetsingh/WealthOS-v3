import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Internal market API proxy to keep keys secure and bypass CORS
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const API_KEY = process.env.VITE_FINNHUB_API_KEY || process.env.FINNHUB_API_KEY;

// Server-side cache
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute server-side cache

app.use(express.json());

// API: Search Assets
app.get("/api/market/search", async (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  const cacheKey = `search_${q}`;
  if (cache.has(cacheKey)) {
    const { data, timestamp } = cache.get(cacheKey);
    if (Date.now() - timestamp < CACHE_TTL) {
      console.info(`WealthOS Server: Serving search for "${q}" from cache`);
      return res.json(data);
    }
  }

  if (!API_KEY) {
    console.error("WealthOS Server: Finnhub API Key is missing.");
    return res.status(500).json({ error: "Market API not configured" });
  }

  try {
    console.info(`WealthOS Server: Proxying search for "${q}"`);
    const response = await axios.get(`${FINNHUB_BASE_URL}/search`, {
      params: {
        q,
        token: API_KEY
      },
      timeout: 5000
    });
    
    cache.set(cacheKey, { data: response.data, timestamp: Date.now() });
    res.json(response.data);
  } catch (error: any) {
    console.error("WealthOS Server: Search proxy error", error.message);
    const status = error.response?.status || 500;
    res.status(status).json({ error: error.message });
  }
});

// API: Get Quote
app.get("/api/market/quote", async (req, res) => {
  const { symbol } = req.query;
  
  if (!symbol) {
    return res.status(400).json({ error: "Symbol parameter is required" });
  }

  const cacheKey = `quote_${symbol}`;
  if (cache.has(cacheKey)) {
    const { data, timestamp } = cache.get(cacheKey);
    if (Date.now() - timestamp < CACHE_TTL) {
      return res.json(data);
    }
  }

  if (!API_KEY) {
    return res.status(500).json({ error: "Market API not configured" });
  }

  try {
    const response = await axios.get(`${FINNHUB_BASE_URL}/quote`, {
      params: {
        symbol,
        token: API_KEY
      },
      timeout: 5000
    });
    
    cache.set(cacheKey, { data: response.data, timestamp: Date.now() });
    res.json(response.data);
  } catch (error: any) {
    console.error(`WealthOS Server: Quote proxy error for ${symbol}`, error.message);
    const status = error.response?.status || 500;
    res.status(status).json({ error: error.message });
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
