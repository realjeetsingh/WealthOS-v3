import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { parseSMS, isFinancialSMS } from '../lib/smsParser';
import { Transaction } from '../types';

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
   * Scan historical SMS (Simulated for 3-7 days)
   */
  syncHistoricalSMS: async (userId: string): Promise<number> => {
    // Simulated SMS history
    const mockSMSHistory = [
      { text: "Rs.120.00 credited to HDFC Bank A/c XX7865 on 18-04-26 from VPA 8375005690@ptaxis", sender: "HDFCBK", date: "2026-04-18" },
      { text: "Sent Rs.999.00 From HDFC Bank A/C *7865 To xyptmedia On 19-04-26", sender: "HDFCBK", date: "2026-04-19" },
      { text: "Your A/c XX1234 is debited for ₹450.00 on 17-04-26 at STARBUCKS. Ref: 6109231", sender: "AXISBK", date: "2026-04-17" },
      { text: "OTP for your transaction is 556677. Do not share.", sender: "SBIBNK", date: "2026-04-19" }, // Should be filtered
      { text: "Cashback of ₹50 credited to your account for shopping at Amazon", sender: "ICICIB", date: "2026-04-16" }
    ];

    let count = 0;
    for (const sms of mockSMSHistory) {
      if (isFinancialSMS(sms.text, sms.sender)) {
        const result = parseSMS(sms.text);
        if ('error' in result) continue;

        const success = await SMSSyncService.addTransactionIfNew(userId, {
          type: result.type,
          amount: result.amount,
          category: 'Auto-Imported',
          notes: `SMS from ${result.merchant} on ${result.date}`,
          source: 'auto',
          status: result.status,
          date: result.date // Used for deduplication check
        } as any);

        if (success) count++;
      }
    }
    return count;
  },

  /**
   * Deduplication check: amount + date + merchant
   */
  addTransactionIfNew: async (userId: string, data: any): Promise<boolean> => {
    const path = `users/${userId}/transactions`;
    const transactionsRef = collection(db, path);
    
    // Simple deduplication query
    const q = query(
      transactionsRef,
      where('amount', '==', data.amount),
      where('type', '==', data.type),
      where('notes', '==', data.notes)
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) return false;

    await addDoc(transactionsRef, {
      ...data,
      source: 'auto',
      timestamp: serverTimestamp()
    });
    return true;
  }
};
