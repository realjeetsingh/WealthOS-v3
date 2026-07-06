// Environment variable manager and validator

// Environment variable cleaning helpers
export const cleanEnvVar = (val: string | undefined): string | undefined => {
  if (!val) return undefined;
  let cleaned = val.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
};

export const isPlaceholder = (val: string | undefined): boolean => {
  if (!val) return true;
  const v = val.toLowerCase();
  return (
    v.includes("placeholder") ||
    v.includes("your_") ||
    v.includes("key_id") ||
    v.includes("key_secret") ||
    v === "null" ||
    v === "undefined" ||
    v.trim() === ""
  );
};

export interface EnvConfig {
  GEMINI_API_KEY?: string;
  FINNHUB_API_KEY?: string;
  COINMARKETCAP_API_KEY?: string;
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
  NODE_ENV: string;
}

export let config: EnvConfig = {
  NODE_ENV: process.env.NODE_ENV || "development"
};

export function validateEnv(): EnvConfig {
  config = {
    GEMINI_API_KEY: cleanEnvVar(process.env.GEMINI_API_KEY),
    FINNHUB_API_KEY: cleanEnvVar(process.env.VITE_FINNHUB_API_KEY || process.env.FINNHUB_API_KEY),
    COINMARKETCAP_API_KEY: cleanEnvVar(process.env.COINMARKETCAP_API_KEY),
    RAZORPAY_KEY_ID: cleanEnvVar(process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID),
    RAZORPAY_KEY_SECRET: cleanEnvVar(process.env.RAZORPAY_KEY_SECRET),
    NODE_ENV: process.env.NODE_ENV || "development"
  };

  console.info("--------------------------------------------------");
  console.info(`[Env] Initializing Environment (NODE_ENV: ${config.NODE_ENV})`);

  if (!config.GEMINI_API_KEY || isPlaceholder(config.GEMINI_API_KEY)) {
    console.warn("[Env] Warning: GEMINI_API_KEY is missing or invalid. AI features will fail.");
  } else {
    console.info(`[Env] Gemini API key configured: ${config.GEMINI_API_KEY.substring(0, 4)}***`);
  }

  if (!config.FINNHUB_API_KEY || isPlaceholder(config.FINNHUB_API_KEY)) {
    console.warn("[Env] Warning: FINNHUB_API_KEY is missing or invalid. Stock market quotes/search will fail.");
  } else {
    console.info(`[Env] Finnhub API key configured: ${config.FINNHUB_API_KEY.substring(0, 4)}***`);
  }

  if (!config.COINMARKETCAP_API_KEY || isPlaceholder(config.COINMARKETCAP_API_KEY)) {
    console.warn("[Env] Warning: COINMARKETCAP_API_KEY is missing or invalid. Will fall back to CoinGecko for crypto quotes.");
  } else {
    console.info(`[Env] CoinMarketCap API key configured: ${config.COINMARKETCAP_API_KEY.substring(0, 4)}***`);
  }

  const isRazorpayConfigured = 
    config.RAZORPAY_KEY_ID && 
    config.RAZORPAY_KEY_SECRET && 
    !isPlaceholder(config.RAZORPAY_KEY_ID) && 
    !isPlaceholder(config.RAZORPAY_KEY_SECRET);

  if (!isRazorpayConfigured) {
    console.warn("[Env] Warning: Razorpay credentials are missing or placeholders. Payment endpoints will run in simulated sandbox fallback mode.");
  } else {
    console.info(`[Env] Razorpay credentials configured (Key ID: ${config.RAZORPAY_KEY_ID?.substring(0, 8)}***)`);
  }
  console.info("--------------------------------------------------");

  return config;
}
