/**
 * Auto-Categorization Engine
 * Rule-based keyword matching + confidence scoring
 */

export interface CategorizationResult {
  category: string;
  confidence: number;
  isAutoMatched: boolean;
}

const CATEGORY_RULES: Record<string, string[]> = {
  'Food': ['zomato', 'swiggy', 'restaurant', 'cafe', 'starbucks', 'domino', 'mcdonald', 'kfc', 'burger', 'pizza', 'dine', 'food', 'bakery', 'swiggy_instamart'],
  'Travel': ['uber', 'ola', 'rapido', 'fuel', 'petrol', 'diesel', 'shell', 'hpcl', 'bpcl', 'flight', 'indigo', 'airindia', 'railway', 'irctc', 'bus', 'travel', 'taxi'],
  'Shopping': ['amazon', 'flipkart', 'myntra', 'ajio', 'zivame', 'nykaa', 'supermarket', 'retail', 'store', 'mart', 'mall', 'blinkit', 'zepto', 'dmart', 'reliance'],
  'Bills': ['electricity', 'water', 'recharge', 'broadband', 'rent', 'jio', 'airtel', 'vi', 'bsnl', 'gas', 'insurance', 'policy', 'subscription', 'mobile', 'utility'],
  'Income': ['salary', 'credited', 'refund', 'bonus', 'dividend', 'interest', 'cashback', 'referral', 'settlement'],
  'Health': ['pharmacy', 'hospital', 'doctor', 'apollo', 'netmeds', 'medplus', 'clinic', 'dentist', 'gym', 'fitness'],
  'Entertainment': ['netflix', 'hotstar', 'prime video', 'cinema', 'theatre', 'gaming', 'spotify', 'itunes', 'apple.com', 'google play'],
};

/**
 * Categorize a transaction based on its description (merchant/notes)
 */
export const categorizeTransaction = (
  description: string, 
  userMappings: Record<string, string> = {}
): CategorizationResult => {
  // CLEANING LOGIC: Extract merchant identity, ignore noise
  const cleaner = (str: string) => {
    return str
      .toLowerCase()
      .replace(/sms from\b/g, '')
      .replace(/\bon\s\d{2}[-\/]\d{2}[-\/]\d{2,4}\b/g, '') // Remove dates
      .replace(/\buapi\b/g, '')
      .replace(/\bupi\b/g, '')
      .replace(/@\w+/g, '') // Remove UPI VPA handles
      .replace(/\d+/g, '') // Remove all numbers (noise like txn IDs)
      .replace(/[^\w\s]/g, ' ') // Remove special chars
      .replace(/\s+/g, ' ') // Collapse spaces
      .trim();
  };

  const normalizedDesc = cleaner(description);
  
  // If cleaning resulted in empty string, fallback to original lowercased
  const finalDesc = normalizedDesc || description.toLowerCase().trim();

  // 1. Check User Learned Mappings first (highest priority)
  if (userMappings[finalDesc]) {
    return {
      category: userMappings[finalDesc],
      confidence: 1.0,
      isAutoMatched: true
    };
  }

  // 2. Multi-word match search (learned mapping for parts of strings)
  for (const [key, category] of Object.entries(userMappings)) {
    if (finalDesc.includes(key.toLowerCase().trim())) {
      return {
        category,
        confidence: 0.95,
        isAutoMatched: true
      };
    }
  }

  // 3. Rule-based Keyword Matching
  for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
    for (const keyword of keywords) {
      if (finalDesc.includes(keyword.toLowerCase())) {
        return {
          category,
          confidence: 0.9,
          isAutoMatched: true
        };
      }
    }
  }

  // 4. Fallback
  return {
    category: 'Other',
    confidence: 0.1,
    isAutoMatched: false
  };
};

export const CATEGORIES = ['Food', 'Travel', 'Shopping', 'Bills', 'Income', 'Health', 'Entertainment', 'Other'];

/**
 * Get emoji for a category
 */
export const getCategoryEmoji = (category: string): string => {
  const emojis: Record<string, string> = {
    'Food': '🍔',
    'Travel': '🚗',
    'Shopping': '🛍️',
    'Bills': '💡',
    'Income': '💰',
    'Health': '🏥',
    'Entertainment': '🎬',
    'Other': '📦'
  };
  return emojis[category] || emojis['Other'];
};
