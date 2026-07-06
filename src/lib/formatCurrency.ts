import { UserProfile } from '../types';
import { 
  formatCurrencyFull as globalFormatCurrencyFull,
  formatCurrencyShort as globalFormatCurrencyShort
} from './currency';

let currentUserProfile: UserProfile | null = null;

/**
 * Sets the global user profile for currency formatting.
 * This is called by AuthContext whenever the profile changes.
 */
export function setGlobalUserProfile(profile: UserProfile | null) {
  currentUserProfile = profile;
}

/**
 * Global currency formatter (Full Value)
 */
export function formatCurrencyFull(value: number | string, currency?: string): string {
  const number = Number(value) || 0;
  const currencyCode = currency || currentUserProfile?.currency;
  return globalFormatCurrencyFull(number, currencyCode);
}

/**
 * Global currency formatter (Short Value)
 */
export function formatCurrencyShort(value: number | string, currency?: string): string {
  const number = Number(value) || 0;
  const currencyCode = currency || currentUserProfile?.currency;
  return globalFormatCurrencyShort(number, currencyCode);
}

/**
 * Default currency formatter (Full Value)
 */
export const formatCurrency = formatCurrencyFull;
