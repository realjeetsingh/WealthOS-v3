import { collection, query, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { fetchBatchPrices } from './marketDataService';

/**
 * Triggers a price sync for all assets in a user's portfolio.
 * Updates the current price and value in Firestore.
 */
export const syncPortfolioPrices = async (userId: string) => {
  if (!userId) return { success: false, error: 'User ID is required' };

  try {
    const portfolioPath = `users/${userId}/portfolio`;
    const snapshot = await getDocs(query(collection(db, portfolioPath)));
    const assets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

    if (assets.length === 0) return { success: true, count: 0 };

    const symbolsToFetch = assets
      .filter(a => a.symbol)
      .map(a => a.symbol);

    if (symbolsToFetch.length === 0) return { success: true, count: 0 };

    const priceData = await fetchBatchPrices(symbolsToFetch);
    
    let updateCount = 0;
    for (const asset of assets) {
      const symbol = asset.symbol;
      if (!symbol) continue;

      const newPrice = priceData[symbol];
      if (newPrice !== null && newPrice !== undefined) {
        const qty = Number(asset.quantity) || (Number(asset.investedAmount) / (Number(asset.avgBuyPrice) || newPrice));
        const newCurrentValue = newPrice * qty;
        
        await updateDoc(doc(db, portfolioPath, asset.id), {
          lastPrice: newPrice,
          currentValue: newCurrentValue,
          quantity: Number(asset.quantity) || qty, // Save the inferred quantity if not present
          lastUpdatedAt: Timestamp.now()
        });
        updateCount++;
      }
    }

    return { success: true, count: updateCount };
  } catch (error) {
    console.error('Portfolio sync error:', error);
    return { success: false, error };
  }
};
