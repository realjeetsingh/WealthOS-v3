import { Timestamp } from 'firebase/firestore';

/**
 * Safely converts any potential timestamp format to a Date object.
 * Handles Firestore Timestamp, JS Date, and POJO timestamps.
 */
export const toDate = (ts: any): Date => {
  if (!ts) return new Date();
  
  if (ts instanceof Date) return ts;
  
  if (typeof ts.toDate === 'function') return ts.toDate();
  
  if (ts.seconds !== undefined) {
    return new Date(ts.seconds * 1000 + (ts.nanoseconds || 0) / 1000000);
  }
  
  const d = new Date(ts);
  return isNaN(d.getTime()) ? new Date() : d;
};
