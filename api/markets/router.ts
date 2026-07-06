import { Router, Request, Response } from 'express';
import axios from 'axios';
import { config } from '../shared/env';

const router = Router();

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

// Server-side cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute server-side cache

// Helper to get or set cache
const getCachedData = (key: string): any | null => {
  if (cache.has(key)) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }
  return null;
};

const setCachedData = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// Stock Search Endpoint: GET /api/markets/stock-search (alias /search)
const handleStockSearch = async (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Search query parameter 'q' is required" });

  const queryStr = q.toString().trim();
  const cacheKey = `search_${queryStr}`;
  
  const cached = getCachedData(cacheKey);
  if (cached) return res.json(cached);

  const finnhubKey = config.FINNHUB_API_KEY;
  if (!finnhubKey) return res.status(503).json({ error: "Market stock API not configured on the server" });

  try {
    const response = await axios.get(`${FINNHUB_BASE_URL}/search`, {
      params: { q: queryStr, token: finnhubKey },
      timeout: 5000
    });
    setCachedData(cacheKey, response.data);
    return res.json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    const errorData = error.response?.data;
    
    console.error(`[Markets] Finnhub Stock Search Error [${queryStr}]`, {
      status,
      message: error.message
    });

    return res.status(status).json({ 
      error: errorData?.error || error.message, 
      type: status === 429 ? 'RATE_LIMIT' : 'API_FAILURE',
      provider: 'finnhub' 
    });
  }
};

router.get('/stock-search', handleStockSearch);
router.get('/search', handleStockSearch); // Alias

// Stock Quote Endpoint: GET /api/markets/stock-quote (alias /quote)
const handleStockQuote = async (req: Request, res: Response) => {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: "Symbol parameter is required" });

  const symbolStr = symbol.toString().toUpperCase().trim();
  const cacheKey = `quote_${symbolStr}`;

  const cached = getCachedData(cacheKey);
  if (cached) return res.json(cached);

  const finnhubKey = config.FINNHUB_API_KEY;
  if (!finnhubKey) return res.status(503).json({ error: "Market stock API not configured on the server" });

  try {
    const response = await axios.get(`${FINNHUB_BASE_URL}/quote`, {
      params: { symbol: symbolStr, token: finnhubKey },
      timeout: 5000
    });
    setCachedData(cacheKey, response.data);
    return res.json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    const errorData = error.response?.data;

    console.error(`[Markets] Finnhub Stock Quote Error [${symbolStr}]`, {
      status,
      message: error.message
    });

    return res.status(status).json({ 
      error: errorData?.error || error.message, 
      type: status === 429 ? 'RATE_LIMIT' : 'API_FAILURE',
      provider: 'finnhub' 
    });
  }
};

router.get('/stock-quote', handleStockQuote);
router.get('/quote', handleStockQuote); // Alias

// Crypto Quote Endpoint: GET /api/markets/crypto-quote (alias /crypto/quote)
const handleCryptoQuote = async (req: Request, res: Response) => {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: "Symbol parameter is required" });

  const symbolStr = symbol.toString().toUpperCase().trim();
  const cacheKey = `crypto_v2_${symbolStr}`;

  const cached = getCachedData(cacheKey);
  if (cached) return res.json(cached);

  const symbols = symbolStr.split(',');

  // PRIMARY: COINMARKETCAP
  const cmcKey = config.COINMARKETCAP_API_KEY;
  if (cmcKey && cmcKey.trim() !== "") {
    try {
      const response = await axios.get(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest`, {
        params: { symbol: symbols.join(',') },
        headers: { 'X-CMC_PRO_API_KEY': cmcKey },
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
        setCachedData(cacheKey, transformedData);
        return res.json(transformedData);
      }
    } catch (error: any) {
      console.error(`[Markets] CMC Fetch Error [${symbolStr}]:`, error.response?.data || error.message);
    }
  }

  // SECONDARY: COINGECKO FALLBACK
  try {
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
      setCachedData(cacheKey, transformedData);
      return res.json(transformedData);
    }
    
    return res.status(404).json({ error: "Crypto not found in any provider" });
  } catch (error: any) {
    console.error(`[Markets] Crypto Proxy Critical Failure [${symbolStr}]:`, error.message);
    return res.status(500).json({ error: "Market data providers unavailable", detail: error.message });
  }
};

router.get('/crypto-quote', handleCryptoQuote);
router.get('/crypto/quote', handleCryptoQuote); // Alias

// Crypto Search Endpoint: GET /api/markets/crypto-search (alias /crypto/search)
const handleCryptoSearch = async (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Search query is required" });

  const queryStr = q.toString().trim();
  try {
    const response = await axios.get(`https://api.coingecko.com/api/v3/search`, {
      params: { query: queryStr },
      timeout: 5000
    });

    const results = (response.data.coins || []).slice(0, 10).map((coin: any) => ({
      symbol: coin.symbol.toUpperCase(),
      description: coin.name,
      type: 'Crypto',
      id: coin.id,
      thumb: coin.large
    }));

    return res.json({ result: results });
  } catch (error: any) {
    console.error(`[Markets] Crypto Search Error [${queryStr}]:`, error.message);
    return res.status(500).json({ error: "Crypto search unavailable" });
  }
};

router.get('/crypto-search', handleCryptoSearch);
router.get('/crypto/search', handleCryptoSearch); // Alias

// Stocks combined endpoint as requested by verification guidelines
router.get('/stocks', async (req: Request, res: Response) => {
  if (req.query.q) {
    return handleStockSearch(req, res);
  }
  if (req.query.symbol) {
    return handleStockQuote(req, res);
  }
  return res.status(400).json({ error: "Query parameter 'q' (search) or 'symbol' (quote) is required" });
});

// Crypto combined endpoint as requested by verification guidelines
router.get('/crypto', async (req: Request, res: Response) => {
  if (req.query.q) {
    return handleCryptoSearch(req, res);
  }
  if (req.query.symbol) {
    return handleCryptoQuote(req, res);
  }
  return res.status(400).json({ error: "Query parameter 'q' (search) or 'symbol' (quote) is required" });
});

export default router;
