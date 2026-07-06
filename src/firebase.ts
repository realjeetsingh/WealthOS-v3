import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { 
  getFirestore, 
  getDocFromServer, 
  doc, 
  enableIndexedDbPersistence,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported, logEvent as firebaseLogEvent } from 'firebase/analytics';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Explicitly enable local session persistence to ensure it survives restarts and refreshes
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error('[Auth] Failed to set explicit auth persistence:', err);
});

export let analytics: any = null;
export const logEvent = firebaseLogEvent;

if (typeof window !== 'undefined') {
  // Check if we are running in localhost, preview, or development run.app environment
  const isLocalOrPreview = 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    window.location.hostname.includes('.run.app') || 
    window.location.hostname.includes('ais-dev') || 
    window.location.hostname.includes('ais-pre');

  if (!isLocalOrPreview) {
    isSupported().then((supported) => {
      if (supported) {
        try {
          analytics = getAnalytics(app);
        } catch (error) {
          console.warn('[Analytics] Failed to initialize Google Analytics:', error);
        }
      }
    }).catch((error) => {
      console.warn('[Analytics] isSupported check failed:', error);
    });
  } else {
    console.info('[Analytics] Disabled in development, preview, or local environments.');
  }
}

// Initialize Firestore with persistent cache
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, firebaseConfig.firestoreDatabaseId || undefined);

export const storage = getStorage(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

async function testConnection() {
  try {
    // Attempt to fetch a document from the server to verify connectivity
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    console.log("Firestore connection verified.");
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes('offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
    // Skip logging for other errors (like permission denied), as this is simply a connectivity test.
  }
}
testConnection();

export default app;
