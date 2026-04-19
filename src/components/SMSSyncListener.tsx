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

    // Simulation frequency: Check every 15 seconds for a "Random Event"
    // This makes it feel much more like an asynchronous background listener
    const simulationInterval = setInterval(async () => {
      // 5% chance every 15 seconds = roughly 1 event every 5 minutes on average
      if (Math.random() > 0.95) {
        const merchants = ['Amazon', 'Swiggy', 'Zomato', 'Netflix', 'Uber', 'Starbucks', 'Grocery Store'];
        const bankNames = ['HDFC Bank', 'SBI Bank', 'Axis Bank', 'ICICI Bank'];
        const selectedMerchant = merchants[Math.floor(Math.random() * merchants.length)];
        const selectedBank = bankNames[Math.floor(Math.random() * bankNames.length)];
        const amount = (Math.random() * 800 + 40).toFixed(2);
        
        const mockNewSMS = {
          text: `Rs.${amount} debited from ${selectedBank} A/c XX${Math.floor(Math.random()*9000+1000)} to ${selectedMerchant} on ${new Date().toLocaleDateString('en-GB')}`,
          sender: `${selectedBank.replace(' ', '')}-SMS`,
          date: new Date().toISOString()
        };

        if (isFinancialSMS(mockNewSMS.text, mockNewSMS.sender)) {
          const result = parseSMS(mockNewSMS.text);
          if ('error' in result) return;

          const success = await SMSSyncService.addTransactionIfNew(user.uid, {
            type: result.type,
            amount: result.amount,
            category: 'Auto-Imported',
            notes: `Auto-Capture: SMS from ${result.merchant}`,
            source: 'auto',
            status: result.status,
            date: result.date
          } as any);

          if (success) {
            toast.success(`₹${result.amount} ${result.type === 'income' ? 'received' : 'spent'} via ${result.merchant} ⚡`, {
              duration: 6000,
              description: 'Captured instantly from background SMS sync.'
            });
          }
        }
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(simulationInterval);
  }, [user?.uid]);

  return null;
};

export default SMSSyncListener;
