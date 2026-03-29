import { UserProfile } from '../types';

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
];

export const DEFAULT_CURRENCY = Intl.NumberFormat().resolvedOptions().currency || 'INR';

/**
 * Global currency formatter
 * @param amount The numeric value to format
 * @param currency The currency code (e.g., "INR", "USD")
 * @returns Formatted string
 */
export const formatCurrency = (amount: number, currency: string = DEFAULT_CURRENCY): string => {
  // Use en-IN for Indian Rupee formatting style (lakhs/crores) if requested, 
  // but generally it's better to use a locale that matches the currency or the user's locale.
  // The user specifically mentioned en-IN in their request.
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};
