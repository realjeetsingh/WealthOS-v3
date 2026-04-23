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
    // TASK 2 & 4: Removed ALL simulated background SMS sync.
    // In a real Android environment, this would initialize a native broadcast receiver
    // to listen for incoming SMS patterns. Since we are in a web preview 
    // and maintaining strict data integrity, simulation is removed.

    const isEnabled = localStorage.getItem('smartSyncEnabled') === 'true';
    if (!isEnabled || !user?.uid) return;

    console.log("SMSSyncListener: Background sync listeners would be active on supported hardware.");
    
    // Periodically log for debug mode if needed, but do not generate fake data.
    return () => {};
  }, [user?.uid]);

  return null;
};

export default SMSSyncListener;
