import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Interface for learned user category mappings
 * Key: Merchant/Source Name (lowercase)
 * Value: Category Name
 */
export interface UserCategoryMappings {
  [merchant: string]: string;
}

const getMappingsPath = (userId: string) => `users/${userId}/meta/categoryMappings`;

/**
 * Fetch user-specific category mappings from Firestore
 */
export const getUserCategoryMappings = async (userId: string): Promise<UserCategoryMappings> => {
  try {
    const docRef = doc(db, getMappingsPath(userId));
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as UserCategoryMappings;
    }
    return {};
  } catch (error) {
    console.error("Error fetching user category mappings:", error);
    return {};
  }
};

/**
 * Update/Learn a new mapping based on user correction
 */
export const updateUserCategoryMapping = async (userId: string, merchant: string, category: string) => {
  if (!merchant || !category) return;
  
  const normalizedMerchant = merchant.toLowerCase().trim();
  const path = getMappingsPath(userId);
  
  try {
    const docRef = doc(db, path);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      await updateDoc(docRef, {
        [normalizedMerchant]: category
      });
    } else {
      await setDoc(docRef, {
        [normalizedMerchant]: category
      });
    }
    console.log(`Learned mapping: ${normalizedMerchant} -> ${category}`);
  } catch (error) {
    console.error("Error updating user category mapping:", error);
  }
};
