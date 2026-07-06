import { addTransaction } from './financeService';

/**
 * Service to handle automatic SMS transaction syncing
 */
export const SMSSyncService = {
  /**
   * Request SMS Permission (Simulated for Browser)
   */
  requestPermission: async (): Promise<boolean> => {
    return new Promise((resolve) => {
      // In a real Android environment, this would call Capacitor.Plugins.SmsReader.requestPermission()
      setTimeout(() => resolve(true), 1000);
    });
  },

  /**
   * Scan historical SMS (Simulated for last 30-60 days)
   */
  syncHistoricalSMS: async (userId: string): Promise<number> => {
    // TASK 2 & 4: Removed ALL mock/simulated SMS history.
    console.log("Historical SMS sync requested for user:", userId);
    
    // Detect platform
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isIOS) {
      console.warn("Auto background sync is disabled on iOS. Only manual imports are permitted.");
      return 0;
    }

    // In a real device environment, this would call native APIs.
    // In web preview, we return 0 as no real SMS can be accessed.
    return 0;
  },

  /**
   * Deduplication check and insert via FinanceService
   */
  addTransactionIfNew: async (userId: string, data: any): Promise<boolean> => {
    try {
      const result = await addTransaction(userId, {
        ...data,
        source: data.source || 'auto'
      });
      return result !== null;
    } catch (error) {
      console.error("SMSSyncService error adding transaction:", error);
      return false;
    }
  }
};
