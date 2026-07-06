import { Transaction, LoanSuggestion, Loan } from '../types';
import { toDate } from '../lib/dateUtils';

/**
 * Loan Detection Engine
 * Refined logic for EMI pattern recognition and confidence scoring.
 */

const LOAN_KEYWORDS = ['emi', 'loan', 'finance', 'credit', 'hfc', 'mfi', 'nbfc', 'mortgage', 'bajaj', 'hdfc', 'sbi', 'icici', 'axis', 'lic'];

const LENDER_MAP: Record<string, string> = {
  'hdfcbk': 'HDFC Bank',
  'hdfcergo': 'HDFC ERGO',
  'bajajfinsv': 'Bajaj Finance',
  'sbibk': 'SBI Bank',
  'icicibk': 'ICICI Bank',
  'axisbk': 'Axis Bank',
  'tatacap': 'Tata Capital',
  'idfcbk': 'IDFC First Bank',
  'dhfl': 'DHFL',
  'indiabulls': 'Indiabulls Finance',
  'muthoot': 'Muthoot Finance',
  'manappuram': 'Manappuram Finance'
};

const normalizeMerchant = (name: any): string => {
  const lower = String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [key, value] of Object.entries(LENDER_MAP)) {
    if (lower.includes(key)) return value;
  }
  return String(name || 'Unknown');
};

export const detectLoanSuggestions = (
  transactions: Transaction[], 
  existingLoans: Loan[],
  ignoredSuggestionIds: string[] = []
): LoanSuggestion[] => {
  const suggestions: LoanSuggestion[] = [];
  
  // Task 8: Edge Cases - filter out income and specific categories
  const expenses = transactions.filter(t => 
    t.type === 'expense' && 
    !['Entertainment', 'Subscription', 'Food', 'Groceries'].includes(t.category) &&
    t.amount >= 500 // Ignore tiny recurring payments
  );

  // Group transactions by normalized merchant
  const merchantGroups: Record<string, Transaction[]> = {};
  expenses.forEach(t => {
    const merchant = t.merchant || t.notes || 'Unknown';
    const normalized = normalizeMerchant(merchant);
    if (!merchantGroups[normalized]) merchantGroups[normalized] = [];
    merchantGroups[normalized].push(t);
  });

  Object.entries(merchantGroups).forEach(([normalizedMerchant, txs]) => {
    // Within each merchant, find amount clusters (+/- 10%)
    const clusters: { amount: number; txs: Transaction[] }[] = [];

    txs.forEach(t => {
      let matchedCluster = clusters.find(c => {
        const diff = Math.abs(c.amount - t.amount);
        const threshold = c.amount * 0.1; // ±10%
        return diff <= threshold;
      });

      if (matchedCluster) {
        matchedCluster.txs.push(t);
        // Slowly update the cluster amount average
        matchedCluster.amount = (matchedCluster.amount + t.amount) / 2;
      } else {
        clusters.push({ amount: t.amount, txs: [t] });
      }
    });

    clusters.forEach(cluster => {
      if (cluster.txs.length < 1) return;

      const merchantLower = normalizedMerchant.toLowerCase();
      const firstTx = cluster.txs[0];
      const suggestionId = `${normalizedMerchant}_${Math.round(cluster.amount)}`;

      // Task 7: Memory - Ignore if in ignored list
      if (ignoredSuggestionIds.includes(suggestionId)) return;

      // Check if already in existing loans
      const alreadyExists = existingLoans.some(loan => {
        const amountDiff = Math.abs(loan.emi - cluster.amount);
        const loanLender = (loan.lenderName || '').toLowerCase();
        return amountDiff <= cluster.amount * 0.1 && 
               (loanLender.includes(merchantLower) || normalizedMerchant.toLowerCase().includes(loanLender));
      });

      if (alreadyExists) return;

      // Task 4: Confidence Scoring System
      let score = 0;

      // Frequency match (+40)
      if (cluster.txs.length >= 3) score += 40;
      else if (cluster.txs.length === 2) score += 20;

      // Amount similarity (+30)
      // Check if amounts are IDENTICAL or very close
      const isIdentical = cluster.txs.every(t => t.amount === cluster.txs[0].amount);
      if (isIdentical && cluster.txs.length >= 2) score += 30;
      else if (cluster.txs.length >= 2) score += 15;

      // Keyword match (+20)
      const hasKeyword = LOAN_KEYWORDS.some(kw => 
        merchantLower.includes(kw) || 
        (firstTx.notes && String(firstTx.notes).toLowerCase().includes(kw))
      );
      if (hasKeyword) score += 20;

      // Known lender (+10)
      const isKnownLender = Object.values(LENDER_MAP).some(l => l === normalizedMerchant);
      if (isKnownLender) score += 10;

      // Task 10: Boost if date frequency is roughly monthly (approx 25-35 days apart)
      if (cluster.txs.length >= 2) {
        const sortedDates = cluster.txs
          .map(t => toDate(t.date || t.timestamp).getTime())
          .sort((a, b) => a - b);
        
        let intervalMatch = false;
        for (let i = 1; i < sortedDates.length; i++) {
          const daysGap = (sortedDates[i] - sortedDates[i-1]) / (1000 * 60 * 60 * 24);
          if (daysGap >= 25 && daysGap <= 35) {
            intervalMatch = true;
            break;
          }
        }
        if (intervalMatch) score += 30; // Extra boost for monthly pattern
      }

      // Thresholds
      if (score >= 50) {
        const sortedByDate = [...cluster.txs].sort((a, b) => 
          toDate(b.date || b.timestamp).getTime() - 
          toDate(a.date || a.timestamp).getTime()
        );

        suggestions.push({
          id: suggestionId,
          merchant: normalizedMerchant,
          amount: Math.round(cluster.amount),
          date: sortedByDate[0].date || toDate(sortedByDate[0].timestamp).toISOString().split('T')[0],
          frequency: cluster.txs.length,
          score: score,
          confidence: score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low',
          transactionIds: cluster.txs.map(t => t.id!).filter(Boolean)
        });
      }
    });
  });

  return suggestions.sort((a, b) => b.score - a.score);
};
