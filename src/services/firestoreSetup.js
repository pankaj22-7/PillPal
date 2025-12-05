import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Alert } from 'react-native';

class FirestoreSetup {
  constructor() {
    this.collectionsInitialized = false;
  }

  // ✅ Initialize all collections when user first registers
  async initializeUserCollections(userInfo) {
    try {
      console.log('🔄 Initializing Firestore collections for user...');

      // Create user profile
      await this.createUserProfile(userInfo);

      // Add default caretaker (optional)
      if (userInfo.caretaker) {
        await this.addCaretaker(userInfo.caretaker);
      }

      this.collectionsInitialized = true;
      console.log('✅ All Firestore collections initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Error initializing collections:', error);
      return false;
    }
  }

  // 👥 Create user profile in 'users' collection
  async createUserProfile(userInfo) {
    try {
      if (!auth.currentUser) {
        throw new Error('No authenticated user found');
      }

      // Use the user's UID as the document ID for easy reference
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        name: userInfo.name || 'PillPal User',
        email: userInfo.email || auth.currentUser.email,
        phone: userInfo.phone || '',
        age: userInfo.age || '',
        preferences: {
          voiceReminders: true,
          smsAlerts: true,
          reminderTone: 'default',
          voiceLanguage: 'en-US',
          missedDoseTimeout: 15, // Minutes
          snoozeInterval: 5, // Minutes
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log('✅ User profile created in Firestore');
      return true;
    } catch (error) {
      console.error('❌ Error creating user profile:', error);
      throw error;
    }
  }

  // 👨‍⚕️ Add caretaker to 'caretakers' collection
  async addCaretaker(caretakerInfo) {
    try {
      if (!auth.currentUser) {
        throw new Error('No authenticated user found');
      }

      const caretakerDoc = await addDoc(collection(db, 'caretakers'), {
        userId: auth.currentUser.uid,
        name: caretakerInfo.name,
        phone: caretakerInfo.phone, // This is where SMS alerts will be sent
        relationship: caretakerInfo.relationship || 'Family',
        email: caretakerInfo.email || '',
        active: true,
        notificationPreferences: {
          missedDoses: true,
          takenConfirmations: true,
          weeklyReports: false,
        },
        createdAt: serverTimestamp(),
      });

      console.log('✅ Caretaker added:', caretakerDoc.id);
      return caretakerDoc.id;
    } catch (error) {
      console.error('❌ Error adding caretaker:', error);
      throw error;
    }
  }

  // 💊 Add medication to 'medications' collection (called by your prescription parser)
  async addMedication(medicationData) {
    try {
      if (!auth.currentUser) {
        throw new Error('No authenticated user found');
      }

      const medicationDoc = await addDoc(collection(db, 'medications'), {
        userId: auth.currentUser.uid,
        name: medicationData.name,
        dosage: medicationData.dosage,
        time: medicationData.time, // 24-hour format (e.g., "08:00")
        frequency: medicationData.frequency || 'Daily',
        instructions: medicationData.instructions || '',
        duration: medicationData.duration || '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: this.calculateEndDate(medicationData.duration),
        adherenceTracking: true,
        notificationsEnabled: true,
        smsAlertsEnabled: true,
        voiceRemindersEnabled: true,
        createdAt: serverTimestamp(),
      });

      console.log('✅ Medication added:', medicationDoc.id);
      return medicationDoc.id;
    } catch (error) {
      console.error('❌ Error adding medication:', error);
      throw error;
    }
  }

  // 📋 Log medication event to 'medicationLogs' collection
  async logMedicationEvent(eventData) {
    try {
      if (!auth.currentUser) return;

      await addDoc(collection(db, 'medicationLogs'), {
        medicationId: eventData.medicationId,
        userId: auth.currentUser.uid,
        medicationName: eventData.medicationName,
        dosage: eventData.dosage,
        scheduledTime: eventData.scheduledTime,
        actualTime: eventData.actualTime || new Date().toISOString(),
        status: eventData.status, // 'taken', 'missed', 'skipped', 'late'
        takenAt: eventData.takenAt,
        missedAt: eventData.missedAt,
        skippedAt: eventData.skippedAt,
        createdAt: serverTimestamp(),
      });

      console.log('✅ Medication event logged:', eventData.status);
    } catch (error) {
      console.error('❌ Error logging medication event:', error);
    }
  }

  // 📱 Log SMS notification to 'smsLogs' collection
  async logSMSNotification(smsData) {
    try {
      if (!auth.currentUser) return;

      await addDoc(collection(db, 'smsLogs'), {
        userId: auth.currentUser.uid,
        recipientPhone: smsData.recipientPhone,
        message: smsData.message,
        type: smsData.type, // 'missed_dose', 'medicine_taken', 'medicine_skipped'
        medicationName: smsData.medicationName,
        success: smsData.success,
        errorMessage: smsData.errorMessage || '',
        sentAt: new Date().toISOString(),
        createdAt: serverTimestamp(),
      });

      console.log('✅ SMS notification logged');
    } catch (error) {
      console.error('❌ Error logging SMS notification:', error);
    }
  }

  // 🔧 Helper function to calculate end date
  calculateEndDate(duration) {
    if (!duration) return null;
    
    const today = new Date();
    const durationMatch = duration.match(/(\d+)\s*(day|week|month)s?/i);
    
    if (durationMatch) {
      const [, amount, unit] = durationMatch;
      const days = unit.toLowerCase() === 'week' ? parseInt(amount) * 7 :
                   unit.toLowerCase() === 'month' ? parseInt(amount) * 30 :
                   parseInt(amount);
      
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + days);
      return endDate.toISOString().split('T')[0];
    }
    
    return null;
  }

  // 🧪 Create sample data for testing
  async createSampleData() {
    try {
      console.log('🧪 Creating sample data for testing...');

      // Sample user profile (if not exists)
      if (!this.collectionsInitialized) {
        await this.createUserProfile({
          name: 'Test User',
          phone: '+1234567890',
          age: '65'
        });
      }

      // Sample caretaker
      await this.addCaretaker({
        name: 'Primary Caretaker',
        phone: '+0987654321', // Replace with your actual phone number for testing
        relationship: 'Family',
        email: 'caretaker@example.com'
      });

      // Sample medication
      const medicationId = await this.addMedication({
        name: 'Test Medicine',
        dosage: '10mg',
        time: '08:00',
        frequency: 'Daily',
        instructions: 'Take with food',
        duration: '30 days'
      });

      // Sample medication log
      await this.logMedicationEvent({
        medicationId: medicationId,
        medicationName: 'Test Medicine',
        dosage: '10mg',
        scheduledTime: '08:00',
        status: 'taken',
        takenAt: new Date().toISOString()
      });

      // Sample SMS log
      await this.logSMSNotification({
        recipientPhone: '+0987654321',
        message: 'Test SMS notification',
        type: 'medicine_taken',
        medicationName: 'Test Medicine',
        success: true
      });

      console.log('✅ Sample data created successfully');
      Alert.alert('Success', 'Sample data created! Check Firebase Console to verify collections.');
    } catch (error) {
      console.error('❌ Error creating sample data:', error);
      Alert.alert('Error', 'Failed to create sample data: ' + error.message);
    }
  }
}

export const firestoreSetup = new FirestoreSetup();
export default firestoreSetup;
