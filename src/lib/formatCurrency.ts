import { UserProfile } from '../types';
import { formatCurrency as globalFormatCurrency } from './currency';

let currentUserProfile: UserProfile | null = null;

/**
 * Sets the global user profile for currency formatting.
 * This is called by AuthContext whenever the profile changes.
 */
export function setGlobalUserProfile(profile: UserProfile | null) {
  currentUserProfile = profile;
}

/**
 * Global currency formatter that uses the current user's preference.
 * @param value The numeric value to format
 * @param currency Optional currency code to override the user's preference
 * @returns Formatted string
 */
export function formatCurrency(value: number | string, currency?: string): string {
  const number = Number(value) || 0;
  const currencyCode = currency || currentUserProfile?.currency;
  return globalFormatCurrency(number, currencyCode);
}
