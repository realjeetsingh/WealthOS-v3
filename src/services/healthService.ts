import { collection, getDocs, query, limit, where } from 'firebase/firestore';
import { db } from '../firebase';

export interface HealthStatus {
  database: 'connected' | 'disconnected' | 'error';
  lastSync: Date | null;
  latency: number;
  errorCount: number;
  apiStatus: Record<string, 'ok' | 'fail'>;
}

export const checkAppHealth = async (userId: string): Promise<HealthStatus> => {
  const start = Date.now();
  const status: HealthStatus = {
    database: 'disconnected',
    lastSync: null,
    latency: 0,
    errorCount: 0,
    apiStatus: {
      firebase: 'ok',
      gemini: 'ok' // Can be updated if needed
    }
  };

  if (!userId) return status;

  try {
    // Check Firestore connection with a small query
    const testQuery = query(collection(db, `users/${userId}/transactions`), limit(1));
    await getDocs(testQuery);
    
    status.database = 'connected';
    status.latency = Date.now() - start;
    status.lastSync = new Date();
  } catch (error) {
    status.database = 'error';
    status.apiStatus.firebase = 'fail';
    console.error("Health check failed:", error);
  }

  return status;
};
