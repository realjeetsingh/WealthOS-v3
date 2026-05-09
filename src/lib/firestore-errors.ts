import { User } from 'firebase/auth';
import { auth } from '../firebase';
import { reportError } from '../services/analytics';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function humanizeFirestoreError(error: any): string {
  const message = error?.message || String(error);
  
  if (message.includes('insufficient permissions')) {
    return "You don't have permission to perform this action. Please sign in again.";
  }
  
  if (message.includes('offline') || message.includes('network')) {
    return "Unable to connect to the database. Check your internet connection and try again.";
  }
  
  if (message.includes('quota exceeded')) {
    return "The daily data limit has been reached. Please try again tomorrow.";
  }
  
  if (message.includes('not-found')) {
    return "This item could not be found. It may have been deleted.";
  }
  
  return "An unexpected error occurred. Please try again later.";
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, userOverride?: User | null) {
  const currentUser = userOverride !== undefined ? userOverride : auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  
  reportError(error, `Firestore:${operationType}:${path}`);
  
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
