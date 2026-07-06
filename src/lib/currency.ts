import { UserProfile } from '../types';

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
];

export const DEFAULT_CURRENCY = Intl.NumberFormat().resolvedOptions().currency || 'INR';

/**
 * Global currency formatter (Full Value)
 * @param amount The numeric value to format
 * @param currency The currency code (e.g., "INR", "USD")
 * @returns Formatted string
 */
export const formatCurrencyFull = (amount: number, currency: string = DEFAULT_CURRENCY): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Smart currency formatter (Short Value: K, L, Cr)
 * @param amount The numeric value to format
 * @param currency The currency code (e.g., "INR", "USD")
 * @returns Formatted string (e.g., ₹1.45Cr)
 */
export const formatCurrencyShort = (amount: number, currency: string = DEFAULT_CURRENCY): string => {
  const symbol = CURRENCIES.find(c => c.code === currency)?.symbol || '₹';
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (absAmount >= 10000000) { // 1 Crore
    return `${sign}${symbol}${(absAmount / 10000000).toFixed(2).replace(/\.00$/, '')}Cr`;
  } else if (absAmount >= 100000) { // 1 Lakh
    return `${sign}${symbol}${(absAmount / 100000).toFixed(2).replace(/\.00$/, '')}L`;
  } else if (absAmount >= 1000) { // 1 Thousand
    return `${sign}${symbol}${(absAmount / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }

  return formatCurrencyFull(amount, currency);
};

export const formatCurrency = formatCurrencyFull;
