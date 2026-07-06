import React, { useEffect } from 'react';
import { triggerRecoverySync, checkAndroidStatus } from '../services/androidBridge';
import { useAuth } from '../contexts/AuthContext';

/**
 * Android Recovery Manager
 * Handles operational resilience by triggering reconciliation scans
 * whenever the app resumes or a user logs in.
 */
const AndroidRecoveryManager: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // 1. Initial Scan on Mount (App Launch)
    const initialSync = setTimeout(() => {
      console.info('WealthOS: Running initial recovery scan...');
      triggerRecoverySync();
    }, 3000);

    // 2. Recovery on App Resume
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.info('WealthOS: App visibility restored. Verifying operational state.');
        triggerRecoverySync();
      }
    };

    // 3. Status Re-verification
    const statusCheck = setInterval(async () => {
      const status = await checkAndroidStatus();
      if (status.isNotificationListenerEnabled) {
        // If listener is enabled, we periodically ensure we didn't miss something 
        // while in background (failsafe)
        triggerRecoverySync();
      }
    }, 300000); // Every 5 minutes

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearTimeout(initialSync);
      clearInterval(statusCheck);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.uid]);

  return null; // Side-effect only component
};

export default AndroidRecoveryManager;
