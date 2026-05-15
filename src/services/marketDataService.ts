/**
 * MarketDataService: Clean architecture for Finnhub API integration
 * Handles price fetching, symbols normalization, caching, line searching and error states.
 */

const API_BASE_URL = '/api/market';

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
 * Searches for symbols matching a query (via internal proxy)
 */
export const searchSymbols = async (query: string): Promise<SymbolResult[]> => {
  console.info(`WealthOS Search: Initiating lookup for "${query}" via internal proxy`);
  
  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const url = `${API_BASE_URL}/search?q=${encodedQuery}`;
    
    const response = await fetch(url);
    
    if (response.status === 429) {
      console.warn("WealthOS Search: Rate limit reached (429)");
      throw new Error("RATE_LIMIT");
    }

    if (!response.ok) {
      console.error(`WealthOS Search: Proxy Error ${response.status} - ${response.statusText}`);
      throw new Error(`HTTP_${response.status}`);
    }
    
    const data = await response.json();
    
    // Finnhub returns { count: number, result: [] } via our proxy
    const results = data.result || []; 
    console.info(`WealthOS Search: Found ${results.length} results for "${query}"`);
    
    return results;
  } catch (error) {
    console.error('WealthOS Search: Critical failure in search pipeline:', error);
    if (error instanceof Error && error.message === "RATE_LIMIT") {
      throw error;
    }
    return [];
  }
};

/**
 * Fetches the latest quote for a symbol (via internal proxy)
 */
export const fetchMarketPrice = async (symbol: string): Promise<number | null> => {
  if (!symbol) return null;
  const standardSymbol = symbol.toUpperCase().trim();
  const now = Date.now();

  // 1. Check Cache
  if (priceCache[standardSymbol] && (now - priceCache[standardSymbol].timestamp < CACHE_DURATION)) {
    return priceCache[standardSymbol].price;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/quote?symbol=${standardSymbol}`);
    
    if (response.status === 429) {
      console.error("WealthOS Market: Rate Limit Reached (429)");
      return priceCache[standardSymbol]?.price || null;
    }

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.c && data.c !== 0) {
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
