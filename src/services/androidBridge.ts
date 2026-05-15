import { toast } from 'sonner';

/**
 * ANDROID NATIVE BRIDGE
 * Orchestrates communication with the WealthOS Android Host.
 */

export interface AndroidSystemStatus {
  isNotificationListenerEnabled: boolean;
  isBatteryOptimizationIgnored: boolean;
  isForegroundServiceActive: boolean;
  lastSyncTimestamp: number;
}

const DEFAULT_STATUS: AndroidSystemStatus = {
  isNotificationListenerEnabled: false,
  isBatteryOptimizationIgnored: false,
  isForegroundServiceActive: false,
  lastSyncTimestamp: Date.now()
};

/**
 * Check the status of required Android permissions and services
 * Native Host will provide this via window.AndroidHost
 */
export const checkAndroidStatus = async (): Promise<AndroidSystemStatus> => {
  const host = (window as any).WealthOSAndroid;
  if (!host) {
    // For web development/simulator
    return { ...DEFAULT_STATUS, isNotificationListenerEnabled: true }; 
  }

  try {
    const statusJson = await host.getSystemStatus();
    return JSON.parse(statusJson);
  } catch (err) {
    console.error('WealthOS Bridge: Failed to check Android status', err);
    return DEFAULT_STATUS;
  }
};

/**
 * Request Notification Listener permission
 * Deep links to android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS
 */
export const requestNotificationPermission = () => {
  const host = (window as any).WealthOSAndroid;
  if (host) {
    host.requestNotificationListenerAccess();
  } else {
    toast.info('Native Access Required', {
      description: 'Open WealthOS on an Android device to enable automation.'
    });
  }
};

/**
 * Request Battery Optimization exclusion
 * Deep links to Battery settings
 */
export const requestBatteryOptimizationExclusion = () => {
  const host = (window as any).WealthOSAndroid;
  if (host) {
    host.requestIgnoreBatteryOptimizations();
  }
};

/**
 * Trigger Active Notification Recovery
 * Forces the native host to re-send all currently active notifications
 */
export const triggerRecoverySync = () => {
  const host = (window as any).WealthOSAndroid;
  if (host) {
    console.info('WealthOS: Triggering active notification recovery sync...');
    host.reprocessActiveNotifications();
    return true;
  }
  return false;
};
