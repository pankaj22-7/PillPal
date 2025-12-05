import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';

// User Profile Operations
export const createUserProfile = async (userId, profileData) => {
  try {
    const userDoc = doc(db, 'users', userId);
    await setDoc(userDoc, {
      ...profileData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating user profile:', error);
    return { success: false, error: error.message };
  }
};

export const getUserProfile = async (userId) => {
  try {
    const userDoc = doc(db, 'users', userId);
    const userSnap = await getDoc(userDoc);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      // ✅ every object property needs a name →  userData
      return { success: true,  userData };
    } else {
      return { success: false, error: 'User not found' };
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { success: false, error: error.message };
  }
};



export const updateUserProfile = async (userId, updateData) => {
  try {
    const userDoc = doc(db, 'users', userId);
    await updateDoc(userDoc, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, error: error.message };
  }
};

// Medication Operations
export const addMedication = async (userId, medicationData) => {
  try {
    const medicationsRef = collection(db, 'medications');
    const docRef = await addDoc(medicationsRef, {
      ...medicationData,
      userId,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error adding medication:', error);
    return { success: false, error: error.message };
  }
};

export const getUserMedications = async (userId) => {
  try {
    const medicationsRef = collection(db, 'medications');
    const q = query(
      medicationsRef, 
      where('userId', '==', userId),
      where('active', '==', true),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const medications = [];
    
    querySnapshot.forEach((doc) => {
      medications.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true,  medications };
  } catch (error) {
    console.error('Error getting medications:', error);
    return { success: false, error: error.message };
  }
};

export const updateMedication = async (medicationId, updateData) => {
  try {
    const medicationDoc = doc(db, 'medications', medicationId);
    await updateDoc(medicationDoc, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating medication:', error);
    return { success: false, error: error.message };
  }
};

export const deleteMedication = async (medicationId) => {
  try {
    const medicationDoc = doc(db, 'medications', medicationId);
    await updateDoc(medicationDoc, {
      active: false,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error deleting medication:', error);
    return { success: false, error: error.message };
  }
};

// Dose Tracking Operations
export const logDose = async (userId, doseData) => {
  try {
    const dosesRef = collection(db, 'doses');
    const docRef = await addDoc(dosesRef, {
      ...doseData,
      userId,
      createdAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error logging dose:', error);
    return { success: false, error: error.message };
  }
};

export const getUserDoses = async (userId, startDate, endDate) => {
  try {
    const dosesRef = collection(db, 'doses');
    const q = query(
      dosesRef,
      where('userId', '==', userId),
      where('scheduledTime', '>=', startDate),
      where('scheduledTime', '<=', endDate),
      orderBy('scheduledTime', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const doses = [];
    
    querySnapshot.forEach((doc) => {
      doses.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true,  doses };
  } catch (error) {
    console.error('Error getting doses:', error);
    return { success: false, error: error.message };
  }
};
