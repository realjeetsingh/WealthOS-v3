import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { UserProfile } from '../types';
import { setGlobalUserProfile } from '../lib/formatCurrency';
import { toast } from 'sonner';

export interface SubscriptionState {
  plan: 'free' | 'pro';
  isPremium: boolean;
  isLifetime: boolean;
  subscriptionState: 'active' | 'inactive';
  purchaseStatus: 'none' | 'success' | 'failed' | 'processing';
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isPremium: boolean;
  subscription: SubscriptionState;
  loading: boolean;
  error: boolean;
  retryAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const retryAuth = () => {
    setError(false);
    setLoading(true);
    setRetryCount(prev => prev + 1);
  };

  const isPremium = userProfile?.plan === 'pro' || (userProfile?.isPremium ?? false);

  const subscription: SubscriptionState = {
    plan: isPremium ? 'pro' : 'free',
    isPremium,
    isLifetime: isPremium,
    subscriptionState: isPremium ? 'active' : 'inactive',
    purchaseStatus: isPremium ? 'success' : 'none'
  };

  useEffect(() => {
    setGlobalUserProfile(userProfile);
    if (userProfile) {
      console.log("Premium status:", userProfile.isPremium);
    }
  }, [userProfile]);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let isMounted = true;

    setLoading(true);
    setError(false);

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!isMounted) return;
      
      const wasLoggedIn = localStorage.getItem('wealthos_was_logged_in') === 'true';
      const manualLogout = localStorage.getItem('wealthos_manual_logout') === 'true';

      setUser(currentUser);
      
      // Cleanup previous profile listener if it exists
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (currentUser) {
        localStorage.setItem('wealthos_was_logged_in', 'true');
        localStorage.removeItem('wealthos_manual_logout');

        // Fetch user profile from Firestore
        const userDocRef = doc(db, 'users', currentUser.uid);
        
        // Use onSnapshot for real-time profile updates
        unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (!isMounted) return;
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
            setError(false);
            setLoading(false);
          } else {
            // Document might be being created by Login/Signup
            // We wait for it to exist before ending loading state
            // Or if it's a first-time email user, they might not have a doc yet
            setUserProfile(null);
            setError(false);
            setLoading(false);
          }
        }, (err) => {
          if (!isMounted) return;
          console.error("Firestore user snapshot error:", err);
          setError(true);
          setLoading(false);
          handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`, currentUser);
        });
      } else {
        setUserProfile(null);
        setError(false);
        setLoading(false);

        localStorage.removeItem('wealthos_was_logged_in');
        if (wasLoggedIn && !manualLogout) {
          toast.error("Your session has expired. Please sign in again.");
        }
      }
    }, (err) => {
      if (!isMounted) return;
      console.error("Auth state changed error:", err);
      setError(true);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, [retryCount]);

  return (
    <AuthContext.Provider value={{ user, userProfile, isPremium, subscription, loading, error, retryAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
