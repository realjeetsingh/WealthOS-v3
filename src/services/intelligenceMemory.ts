import { collection, query, where, getDocs, doc, setDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db, auth } from '../firebase';

export type PatternType = 'merchant_category' | 'recurring_transaction';

export interface LearnedPattern {
  id?: string;
  userId: string;
  patternType: PatternType;
  key: string;
  value: string;
  confidenceImpact?: number;
  lastObservedAt: any;
  occurrenceCount: number;
}

/**
 * INTELLIGENCE MEMORY SERVICE
 * Manages the learning engine for WealthOS
 */

/**
 * Fetch all learned merchant-category mappings for the current user
 */
export const fetchUserMappings = async (): Promise<Record<string, string>> => {
  if (!auth.currentUser) return {};

  try {
    const memoryRef = collection(db, `users/${auth.currentUser.uid}/intelligence_memory`);
    const q = query(memoryRef, where('patternType', '==', 'merchant_category'));
    const snapshot = await getDocs(q);

    const mappings: Record<string, string> = {};
    snapshot.forEach(doc => {
      const data = doc.data() as LearnedPattern;
      mappings[data.key.toLowerCase()] = data.value;
    });

    return mappings;
  } catch (error) {
    console.error('WealthOS: Failed to fetch user mappings', error);
    return {};
  }
};

/**
 * Store or update a merchant-category preference
 */
export const learnMerchantCategory = async (merchant: string, category: string) => {
  if (!auth.currentUser || !merchant || !category) return;

  const mKey = merchant.toLowerCase().trim();
  const patternId = `mc_${mKey.replace(/\s+/g, '_')}`;
  const patternRef = doc(db, `users/${auth.currentUser.uid}/intelligence_memory`, patternId);

  try {
    await setDoc(patternRef, {
      userId: auth.currentUser.uid,
      patternType: 'merchant_category',
      key: mKey,
      value: category,
      lastObservedAt: serverTimestamp(),
      occurrenceCount: increment(1)
    }, { merge: true });
    
    console.log(`WealthOS Memory: Learned ${mKey} -> ${category}`);
  } catch (error) {
    console.error('WealthOS Memory: Failed to save learning pattern', error);
  }
};

/**
 * Detect recurring patterns (Subscription / EMI / Salary)
 * In the future, this will analyze historical transactions.
 */
export const detectRecurringPattern = async (merchant: string, amount: number) => {
  // Placeholder for behavioral intelligence
  // If we see same merchant + same amount 3 times, we flag as recurring
};
