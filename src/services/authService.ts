import { User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const resolveUserSession = async (user: User) => {
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      // Existing user: Update last login
      await updateDoc(userDocRef, {
        lastLogin: serverTimestamp(),
      });
      return { isNewUser: false, profile: userSnap.data() };
    } else {
      // New user: Create profile with explicit onboardingCompleted: false
      const newProfile = {
        name: user.displayName || 'User',
        email: user.email,
        profileImage: user.photoURL,
        currency: 'INR',
        role: 'user',
        isPremium: false,
        onboardingCompleted: false,
        hasSeenIntro: false,
        lastLogin: serverTimestamp(),
        createdAt: serverTimestamp(),
        providers: user.providerData.map(p => p.providerId)
      };
      
      await setDoc(userDocRef, newProfile);
      return { isNewUser: true, profile: newProfile };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`, user);
    throw error;
  }
};
