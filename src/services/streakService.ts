import { doc, getDoc, updateDoc, setDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../firebase';

export interface UserStreak {
  currentStreak: number;
  longestStreak: number;
  lastVisitDate: string; // YYYY-MM-DD
  totalVisits: number;
}

export const updateStreak = async (userId: string) => {
  if (!userId) return null;

  const userRef = doc(db, 'users', userId);
  const streakRef = doc(db, `users/${userId}/meta`, 'streak');
  
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  try {
    const streakSnap = await getDoc(streakRef);
    
    if (!streakSnap.exists()) {
      const initialStreak: UserStreak = {
        currentStreak: 1,
        longestStreak: 1,
        lastVisitDate: today,
        totalVisits: 1
      };
      await setDoc(streakRef, initialStreak);
      return initialStreak;
    }

    const data = streakSnap.data() as UserStreak;
    
    if (data.lastVisitDate === today) {
      return data; // Already visited today
    }

    let newStreak = 1;
    if (data.lastVisitDate === yesterdayStr) {
      newStreak = data.currentStreak + 1;
    }

    const updatedStreak: UserStreak = {
      currentStreak: newStreak,
      longestStreak: Math.max(data.longestStreak, newStreak),
      lastVisitDate: today,
      totalVisits: data.totalVisits + 1
    };

    await updateDoc(streakRef, {
      ...updatedStreak,
      updatedAt: serverTimestamp()
    });

    // Also update main user profile lastActiveDate
    await updateDoc(userRef, {
      lastActiveDate: serverTimestamp(),
      streak: newStreak
    });

    return updatedStreak;
  } catch (error) {
    console.error("Error updating streak:", error);
    return null;
  }
};

export const getStreak = async (userId: string): Promise<UserStreak | null> => {
  if (!userId) return null;
  try {
    const streakSnap = await getDoc(doc(db, `users/${userId}/meta`, 'streak'));
    return streakSnap.exists() ? (streakSnap.data() as UserStreak) : null;
  } catch (error) {
    console.error("Error fetching streak:", error);
    return null;
  }
};
