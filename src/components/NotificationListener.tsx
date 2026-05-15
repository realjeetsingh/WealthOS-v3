import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { processIncomingNotification, RawNotification } from '../services/notificationIntelligence';
import { toast } from 'sonner';

/**
 * PRODUCTION NOTIFICATION BRIDGE
 * This component acts as the global listener for real Android notifications
 * sent from the native Host via window.onWealthOSNotification
 */
const NotificationListener: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // 1. Define the Global Bridge Handler
    // Native Android side will call: window.onWealthOSNotification(jsonPayload)
    (window as any).onWealthOSNotification = async (payload: string | RawNotification) => {
      console.log('WealthOS: Native notification payload received', payload);
      
      try {
        const notification: RawNotification = typeof payload === 'string' 
          ? JSON.parse(payload) 
          : payload;

        // Validation for production safety
        if (!notification.app || !notification.body) {
          console.warn('WealthOS: Invalid notification structure received', notification);
          return;
        }

        const result = await processIncomingNotification({
          ...notification,
          timestamp: new Date()
        });

        if (result.success && result.status === 'SUCCESS') {
          toast.success(`Smart Insight: detected ${result.data?.merchant} transaction`, {
            description: `₹${result.data?.amount} detected from ${notification.app}. Review in Hub.`,
            duration: 5000,
          });
        } else if (result.status === 'FILTERED') {
          console.log(`WealthOS: Notification filtered: ${result.error}`);
        } else if (result.status === 'DUPLICATE_IGNORED') {
          console.log(`WealthOS: Duplicate transaction ignored`);
        } else {
          console.error(`WealthOS: Failed to parse notification: ${result.error}`);
        }

      } catch (err) {
        console.error('WealthOS: Error processing native notification', err);
      }
    };

    console.info('WealthOS: Operational intelligence bridge established. Awaiting signals.');

    return () => {
      // Cleanup for hot-reloads
      delete (window as any).onWealthOSNotification;
    };
  }, [user?.uid]);

  return null;
};

export default NotificationListener;
