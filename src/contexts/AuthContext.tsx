import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { UserProfile } from '../types';
import { setGlobalUserProfile } from '../lib/formatCurrency';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isPremium: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isPremium = userProfile?.plan === 'pro' || (userProfile?.isPremium ?? false);

  useEffect(() => {
    setGlobalUserProfile(userProfile);
    if (userProfile) {
      console.log("Premium status:", userProfile.isPremium);
    }
  }, [userProfile]);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      // Cleanup previous profile listener if it exists
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (currentUser) {
        // Fetch user profile from Firestore
        const userDocRef = doc(db, 'users', currentUser.uid);
        
        // Use onSnapshot for real-time profile updates
        unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            // STEP 3 — SAFE PROFILE SET: No fallback override
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            setUserProfile(null);
          }
          // STEP 4 — HANDLE LOADING: Ensure loading = false only after snapshot fires
          setLoading(false);
        }, (error) => {
          setLoading(false);
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`, currentUser);
        });
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, isPremium, loading }}>
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
