/**
 * MarketDataService: Clean architecture for Finnhub API integration
 * Handles price fetching, symbols normalization, caching, line searching and error states.
 */

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY || '';

// Cache & Rate Limit Config
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const BATCH_COOLDOWN = 30 * 1000; // 30 seconds cooldown between manual bulk refreshes

interface PriceCache {
  [symbol: string]: {
    price: number;
    timestamp: number;
  };
}

export interface SymbolResult {
  displaySymbol: string;
  symbol: string;
  description: string;
  type: string;
}

// In-memory cache
const priceCache: PriceCache = {};
let lastBulkRefresh = 0;

/**
 * Normalizes user input to standardized API symbols
 */
export const normalizeSymbol = (nameOrSymbol: string): string => {
  const mapping: { [key: string]: string } = {
    'apple': 'AAPL',
    'google': 'GOOGL',
    'microsoft': 'MSFT',
    'amazon': 'AMZN',
    'tesla': 'TSLA',
    'bitcoin': 'BINANCE:BTCUSDT',
    'ethereum': 'BINANCE:ETHUSDT',
    'gold': 'OANDA:XAU_USD',
    'nifty': 'INDEX:NIFTY50',
  };

  const normalized = nameOrSymbol.toLowerCase().trim();
  return mapping[normalized] || nameOrSymbol.toUpperCase().trim();
};

/**
 * Searches for symbols matching a query (Finnhub /search)
 */
export const searchSymbols = async (query: string): Promise<SymbolResult[]> => {
  if (!query || query.length < 1) return [];
  if (!API_KEY) {
    console.warn("Finnhub API Key is missing for search.");
    return [];
  }

  try {
    const response = await fetch(`${FINNHUB_BASE_URL}/search?q=${query}&token=${API_KEY}`);
    if (!response.ok) throw new Error(`Search failed: ${response.statusText}`);
    const data = await response.json();
    return data.result || [];
  } catch (error) {
    console.error('Symbol search error:', error);
    return [];
  }
};

/**
 * Fetches the latest quote for a symbol
 * Includes caching and rate-limit handling
 */
export const fetchMarketPrice = async (symbol: string): Promise<number | null> => {
  if (!symbol) return null;
  const standardSymbol = symbol.toUpperCase().trim();
  const now = Date.now();

  // 1. Check Cache
  if (priceCache[standardSymbol] && (now - priceCache[standardSymbol].timestamp < CACHE_DURATION)) {
    return priceCache[standardSymbol].price;
  }

  // 2. API Fetch
  if (!API_KEY) {
    console.warn("Finnhub API Key is missing. Using cached or null values.");
    return priceCache[standardSymbol]?.price || null;
  }

  try {
    const response = await fetch(`${FINNHUB_BASE_URL}/quote?symbol=${standardSymbol}&token=${API_KEY}`);
    
    if (response.status === 429) {
      console.error("Finnhub Rate Limit Reached (429)");
      return priceCache[standardSymbol]?.price || null;
    }

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Finnhub 'c' is the current price. 0 usually means not found or market closed (but 0 itself is valid for some).
    // Finnhub returns c=0 for invalid symbols often.
    if (data.c && data.c !== 0) {
      // Update Cache
      priceCache[standardSymbol] = {
        price: data.c,
        timestamp: now
      };
      return data.c;
    }

    return priceCache[standardSymbol]?.price || null;
  } catch (error) {
    console.error(`Error fetching price for ${standardSymbol}:`, error);
    return priceCache[standardSymbol]?.price || null;
  }
};

/**
 * Batch fetch helper (sequential for rate limit control)
 * Implements Step 7: Rate Limit Protection & Cooldown
 */
export const fetchBatchPrices = async (symbols: string[], isManual = false): Promise<{ [symbol: string]: number | null }> => {
  const now = Date.now();
  
  if (isManual && (now - lastBulkRefresh < BATCH_COOLDOWN)) {
    console.warn(`Bulk refresh on cooldown. Please wait ${Math.ceil((BATCH_COOLDOWN - (now - lastBulkRefresh)) / 1000)}s`);
    // Return cached values for all symbols
    const results: { [symbol: string]: number | null } = {};
    symbols.forEach(s => {
      results[s] = priceCache[s.toUpperCase()]?.price || null;
    });
    return results;
  }

  if (isManual) lastBulkRefresh = now;

  const results: { [symbol: string]: number | null } = {};
  
  // Use a simple loop with a small delay between calls to be respectful to the API
  for (const symbol of symbols) {
    results[symbol] = await fetchMarketPrice(symbol);
    await new Promise(resolve => setTimeout(resolve, 150)); // 150ms delay
  }
  
  return results;
};
