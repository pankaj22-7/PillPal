import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase';

class MedicationValidator {
  
  // Check for duplicate medications
  async checkForDuplicates(newMedications) {
    try {
      // Get user's existing active medications
      const existingMedsRef = query(
        collection(db, 'medications'),
        where('userId', '==', auth.currentUser?.uid || ''),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(existingMedsRef);
      const existingMedications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const duplicates = [];
      const unique = [];

      newMedications.forEach(newMed => {
        const isDuplicate = existingMedications.some(existingMed => 
          this.areMedicationsSimilar(newMed.name, existingMed.name) &&
          this.areDosagesSimilar(newMed.dosage, existingMed.dosage)
        );

        if (isDuplicate) {
          duplicates.push(newMed);
        } else {
          unique.push(newMed);
        }
      });

      return {
        duplicates,
        unique,
        hasDuplicates: duplicates.length > 0
      };

    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return { duplicates: [], unique: newMedications, hasDuplicates: false };
    }
  }

  // Compare medication names for similarity
  areMedicationsSimilar(name1, name2) {
    const normalize = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalized1 = normalize(name1);
    const normalized2 = normalize(name2);
    
    // Exact match
    if (normalized1 === normalized2) return true;
    
    // Check if one contains the other (for generic vs brand names)
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
      return true;
    }
    
    return false;
  }

  // Compare dosages for similarity
  areDosagesSimilar(dosage1, dosage2) {
    const normalize = (dosage) => dosage.toLowerCase().replace(/[^a-z0-9.]/g, '');
    return normalize(dosage1) === normalize(dosage2);
  }

  // Validate required fields
  validateRequiredFields(medications) {
    return medications.map(med => ({
      ...med,
      isValid: !!(med.name && med.dosage && med.frequency),
      validationErrors: this.getValidationErrors(med)
    }));
  }

  getValidationErrors(medication) {
    const errors = [];
    if (!medication.name) errors.push('Medication name is required');
    if (!medication.dosage) errors.push('Dosage is required');
    if (!medication.frequency) errors.push('Frequency is required');
    return errors;
  }
}

export const medicationValidator = new MedicationValidator();
export default medicationValidator;
