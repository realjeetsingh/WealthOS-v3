import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SMSSyncService } from '../services/smsSyncService';
import { parseSMS, isFinancialSMS } from '../lib/smsParser';
import { toast } from 'sonner';

/**
 * A "Invisible" listener that simulates real-time SMS detection
 * when Smart Sync is enabled.
 */
const SMSSyncListener: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    // Check if smart sync is enabled in localStorage
    const isEnabled = localStorage.getItem('smartSyncEnabled') === 'true';
    if (!isEnabled || !user?.uid) return;

    // Simulate "Real-time" detection of incoming SMS
    // In a real mobile app, this would be a Native Event Listener
    const simulationInterval = setInterval(async () => {
      // 10% chance to "receive" a simulated SMS every 2 minutes for demo purposes
      if (Math.random() > 0.9) {
        const mockNewSMS = {
          text: `Rs.${(Math.random() * 500 + 50).toFixed(2)} debited from Bank A/c XX1234 to Zomato on ${new Date().toLocaleDateString('en-GB')}`,
          sender: "BANK-SMS",
          date: new Date().toISOString()
        };

        if (isFinancialSMS(mockNewSMS.text, mockNewSMS.sender)) {
          const result = parseSMS(mockNewSMS.text);
          if ('error' in result) return;

          const success = await SMSSyncService.addTransactionIfNew(user.uid, {
            type: result.type,
            amount: result.amount,
            category: 'Auto-Imported',
            notes: `SMS from ${result.merchant} on ${result.date}`,
            source: 'auto',
            status: result.status,
            date: result.date
          } as any);

          if (success) {
            toast.success(`₹${result.amount} spent at ${result.merchant} added automatically ⚡`, {
              duration: 5000,
              description: 'Smart Sync detected a new bank SMS'
            });
          }
        }
      }
    }, 120000); // Check every 2 minutes

    return () => clearInterval(simulationInterval);
  }, [user?.uid]);

  return null;
};

export default SMSSyncListener;
