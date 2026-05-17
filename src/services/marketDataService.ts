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
export const searchSymbols = async (query: string, isCrypto = false): Promise<SymbolResult[]> => {
  const flavor = isCrypto ? 'Crypto' : 'Stock';
  console.info(`WealthOS Search: Initiating ${flavor} lookup for "${query}" via internal proxy`);
  
  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const endpoint = isCrypto ? "/crypto/search" : "/search";
    const url = `${API_BASE_URL}${endpoint}?q=${encodedQuery}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`WealthOS Search: Proxy Error ${response.status}`, data);
      const errorMsg = data.type || `HTTP_${response.status}`;
      throw new Error(errorMsg);
    }
    
    // Both Finnhub and our new Crypto proxy return { result: [] }
    const results = data.result || []; 
    console.info(`WealthOS Search: Found ${results.length} ${flavor} results for "${query}"`);
    
    return results;
  } catch (error: any) {
    console.error('WealthOS Search: Critical failure in search pipeline:', error);
    if (error.message === 'RATE_LIMIT' || error.message === 'AUTH_FAILURE' || error.message === 'API_FAILURE') {
      throw error;
    }
    throw new Error('API_FAILURE');
  }
};

export interface MarketPriceResult {
  price: number;
  change24h?: number;
  lastUpdated: number;
}

/**
 * Fetches the latest crypto price from CoinMarketCap (via server proxy)
 */
export const fetchCryptoPrice = async (symbol: string): Promise<number | null> => {
  if (!symbol) return null;
  const s = symbol.toLowerCase().trim();
  const now = Date.now();

  const cacheKey = `crypto_${s}`;
  if (priceCache[cacheKey] && (now - priceCache[cacheKey].timestamp < CACHE_DURATION)) {
    return priceCache[cacheKey].price;
  }

  try {
    // Note: The proxy now handles CoinMarketCap predominantly using symbols
    const response = await fetch(`${API_BASE_URL}/crypto/quote?symbol=${s.toUpperCase()}`);
    if (!response.ok) return null;
    
    const data = await response.json();
    const price = data[s]?.usd;
    
    if (price) {
      priceCache[cacheKey] = {
        price,
        timestamp: now
      };
      return price;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching crypto price for ${s}:`, error);
    return null;
  }
};

/**
 * Validates and sanitizes Profit/Loss calculations to prevent absurd UI values.
 */
export const calculateSafeGainLoss = (current: number, invested: number): { gainLoss: number; percentage: number } => {
  if (invested <= 0) {
    return { gainLoss: 0, percentage: 0 };
  }

  const gainLoss = current - invested;
  const percentage = (gainLoss / invested) * 100;

  // Safeguards for absurd values (e.g., +9999900%)
  const SANITY_LIMIT = 5000; // 5000% is a lot but possible in crypto, +99999% is usually bad data
  
  return {
    gainLoss,
    percentage: Math.min(percentage, SANITY_LIMIT)
  };
};

/**
 * Fetches the latest quote for a symbol (via internal proxy)
 */
export const fetchMarketPrice = async (symbol: string, isCrypto = false): Promise<number | null> => {
  if (!symbol) return null;
  
  if (isCrypto) {
    return fetchCryptoPrice(symbol);
  }

  const standardSymbol = symbol.toUpperCase().trim();
  const now = Date.now();

  // 1. Check Cache
  if (priceCache[standardSymbol] && (now - priceCache[standardSymbol].timestamp < CACHE_DURATION)) {
    return priceCache[standardSymbol].price;
  }

  try {
    const encodedSymbol = encodeURIComponent(standardSymbol);
    const response = await fetch(`${API_BASE_URL}/quote?symbol=${encodedSymbol}`);
    
    if (response.status === 429) {
      console.error("WealthOS Market: Rate Limit Reached (429)");
      return priceCache[standardSymbol]?.price || null;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || response.statusText || `Status ${response.status}`;
      throw new Error(`API Error: ${errorMessage}`);
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
export const fetchBatchPrices = async (
  symbols: { symbol: string; isCrypto?: boolean }[], 
  isManual = false
): Promise<{ [symbol: string]: number | null }> => {
  const now = Date.now();
  
  if (isManual && (now - lastBulkRefresh < BATCH_COOLDOWN)) {
    console.warn(`Bulk refresh on cooldown. Please wait ${Math.ceil((BATCH_COOLDOWN - (now - lastBulkRefresh)) / 1000)}s`);
    const results: { [symbol: string]: number | null } = {};
    symbols.forEach(s => {
      const cacheKey = s.isCrypto ? `crypto_${s.symbol.toLowerCase()}` : s.symbol.toUpperCase();
      results[s.symbol] = priceCache[cacheKey]?.price || null;
    });
    return results;
  }

  if (isManual) lastBulkRefresh = now;

  const results: { [symbol: string]: number | null } = {};
  
  // Use a simple loop with a small delay between calls to be respectful to the API
  for (const item of symbols) {
    results[item.symbol] = await fetchMarketPrice(item.symbol, item.isCrypto);
    await new Promise(resolve => setTimeout(resolve, 150)); // 150ms delay
  }
  
  return results;
};
