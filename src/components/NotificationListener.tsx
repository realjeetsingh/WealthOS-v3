import React, { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { processIncomingNotification, RawNotification } from '../services/notificationIntelligence';
import { triggerRecoverySync } from '../services/androidBridge';
import { toast } from 'sonner';

/**
 * PRODUCTION NOTIFICATION BRIDGE (V2 - Operational Stability)
 * This component acts as the global listener for real Android notifications.
 * Features:
 * - Real-time processing
 * - App-resume recovery sync
 * - Local ID de-duplication
 */
const NotificationListener: React.FC = () => {
  const { user } = useAuth();
  const processedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    // 1. Define the Global Bridge Handler
    (window as any).onWealthOSNotification = async (payload: string | RawNotification) => {
      try {
        const notification: RawNotification = typeof payload === 'string' 
          ? JSON.parse(payload) 
          : payload;

        // Validation for production safety
        if (!notification.app || !notification.body) return;

        // LOCAL DEDUPE: Prevent re-parsing if native host sends duplicates during recovery
        const uniqueId = notification.id || `${notification.app}|${notification.body.substring(0, 50)}`;
        if (processedIds.current.has(uniqueId)) {
          console.debug(`WealthOS: Notification ${uniqueId} already processed in this session.`);
          return;
        }
        processedIds.current.add(uniqueId);

        const result = await processIncomingNotification({
          ...notification,
          timestamp: new Date()
        });

        if (result.success && result.status === 'SUCCESS') {
          toast.success(`Smart Insight: ${result.data?.merchant}`, {
            description: `₹${result.data?.amount} detected from ${notification.app}. Review in Hub.`,
            duration: 5000,
          });
        }
      } catch (err) {
        console.error('WealthOS: Error processing native notification', err);
      }
    };

    // 2. RECOVERY PROTOCOL: Reprocess missed notifications on mount (app resume)
    // We delay slightly to ensure the bridge is fully established
    const recoveryTimer = setTimeout(() => {
      triggerRecoverySync();
    }, 2000);

    console.info('WealthOS: Operational intelligence bridge established. Awaiting signals.');

    return () => {
      clearTimeout(recoveryTimer);
      delete (window as any).onWealthOSNotification;
    };
  }, [user?.uid]);

  return null;
};

export default NotificationListener;
