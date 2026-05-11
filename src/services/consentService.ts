import { collection, doc, setDoc, getDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

export enum ConsentType {
  TERMS_AND_PRIVACY = 'terms_and_privacy',
  NOTIFICATION_FETCHING = 'notification_fetching',
  SMS_PARSING = 'sms_parsing',
  AI_FINANCIAL_DISCLAIMER = 'ai_financial_disclaimer'
}

export interface ConsentRecord {
  userId: string;
  type: ConsentType;
  version: string;
  appVersion: string;
  timestamp: any;
  status: 'accepted' | 'revoked';
}

const CURRENT_APP_VERSION = '1.2.0-beta';
const POLICY_VERSION = '2026.05.11';

export const recordLegalConsent = async (userId: string) => {
  try {
    const legalRef = doc(db, `users/${userId}/consents`, 'legal');
    await setDoc(legalRef, {
      userId,
      termsAccepted: true,
      privacyAccepted: true,
      acceptedAt: serverTimestamp(),
      policyVersion: POLICY_VERSION,
      appVersion: CURRENT_APP_VERSION,
      status: 'accepted'
    });
  } catch (error) {
    console.error('Error recording legal consent:', error);
    throw error;
  }
};

export const checkLegalConsent = async (userId: string): Promise<boolean> => {
  try {
    const legalRef = doc(db, `users/${userId}/consents`, 'legal');
    const docSnap = await getDoc(legalRef);
    
    if (!docSnap.exists()) return false;
    
    const data = docSnap.data();
    return data.status === 'accepted' && data.policyVersion === POLICY_VERSION;
  } catch (error) {
    console.error('Error checking legal consent:', error);
    return false;
  }
};
