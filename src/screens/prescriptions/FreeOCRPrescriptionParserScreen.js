import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Alert, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Card, Text, Button, FAB, Surface, 
  ActivityIndicator, Chip, ProgressBar 
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { aiPrescriptionParser } from '../../services/debugEnhancedOCRParser';
import { medicationValidator } from '../../services/medicationValidator';
import { medicineNotificationService } from '../../services/medicineNotificationService';

const { width } = Dimensions.get('window');

export default function FreeOCRPrescriptionParserScreen({ navigation }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [medicationSchedules, setMedicationSchedules] = useState([]);
  const [duplicateCheck, setDuplicateCheck] = useState(null);
  const [step, setStep] = useState('upload'); // upload, processing, review, duplicates, confirm
  const [caretakers, setCaretakers] = useState([]);

  const userPreferences = {
    wakeTime: '08:00',
    bedTime: '22:00',
    mealTimes: {
      breakfast: '08:00',
      lunch: '13:00',
      dinner: '19:00'
    }
  };

  // Load caretakers when component mounts
  useEffect(() => {
    loadUserCaretakers();
  }, []);

  // Load caretakers from database
  const loadUserCaretakers = async () => {
    try {
      if (!auth.currentUser) return;

      const caretakersQuery = query(
        collection(db, 'caretakers'),
        where('userId', '==', auth.currentUser.uid),
        where('active', '==', true)
      );

      const caretakersSnapshot = await getDocs(caretakersQuery);
      const caretakersList = [];

      caretakersSnapshot.forEach((doc) => {
        caretakersList.push({
          id: doc.id,
          ...doc.data()
        });
      });

      setCaretakers(caretakersList);
      console.log(`✅ Loaded ${caretakersList.length} caretakers for notifications`);
    } catch (error) {
      console.error('❌ Error loading caretakers:', error);
      // Set default caretaker for testing
      setCaretakers([
        {
          id: 'default',
          name: 'Primary Caretaker',
          phone: '+1234567890', // Replace with actual phone number
          relationship: 'Family',
          active: true
        }
      ]);
    }
  };

  // Step 1: Image Selection
  const selectImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
      setStep('review');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
      setStep('review');
    }
  };

  // Test function with sample text
  const testWithSampleText = async () => {
    setProcessing(true);
    setStep('processing');
    setProgress(0);
    
    try {
      console.log('🧪 Testing AI prescription analysis...');
      setProcessingStep('🤖 Running AI analysis test...');
      setProgress(0.5);
      
      const result = await aiPrescriptionParser.processPrescriptionImage(
        'sample://text',
        userPreferences
      );
      
      console.log('✅ AI test completed:', result);
      setProgress(1.0);
      setProcessingStep('🎉 AI analysis test completed!');
      
      setExtractedText(result.extractedText);
      setParsedData(result.parsedData);
      setMedicationSchedules(result.medicationSchedules);
      
      if (result.totalMedications > 0) {
        setStep('confirm');
        Alert.alert(
          'AI Analysis Successful!',
          `AI found ${result.totalMedications} medications with ${Math.round(result.parsedData.confidence * 100)}% confidence`,
          [{ text: 'Continue' }]
        );
      } else {
        Alert.alert('AI Analysis', 'No medications detected in test analysis.');
      }
      
    } catch (error) {
      console.error('AI test failed:', error);
      Alert.alert('AI Test Failed', error.message);
      setStep('upload');
    } finally {
      setProcessing(false);
    }
  };

  // Main processing function
  const processPrescription = async () => {
    if (!selectedImage) return;

    setProcessing(true);
    setStep('processing');
    setProgress(0);
    
    try {
      setProcessingStep('🤖 AI analyzing prescription image...');
      setProgress(0.3);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProcessingStep('🧠 AI extracting medication data...');
      setProgress(0.6);
      
      const result = await aiPrescriptionParser.processPrescriptionImage(
        selectedImage.uri,
        userPreferences
      );
      
      console.log('🎯 AI processing completed:', result);
      
      if (result.totalMedications === 0) {
        setProgress(1.0);
        setProcessingStep('❌ No medications detected');
        
        Alert.alert(
          'AI Analysis Complete',
          'AI could not detect medications in this prescription. Try a clearer image or test the AI functionality.',
          [
            { text: 'Test AI', onPress: testWithSampleText },
            { text: 'Retry', onPress: () => setStep('review') },
            { text: 'Manual Entry', onPress: () => navigation.navigate('Meds', { screen: 'AddMed' }) }
          ]
        );
        setStep('review');
        return;
      }
      
      setExtractedText(result.extractedText);
      setParsedData(result.parsedData);
      setMedicationSchedules(result.medicationSchedules);
      
      // Check for duplicates if validator exists
      if (medicationValidator) {
        try {
          const duplicateResult = await medicationValidator.checkForDuplicates(
            result.medicationSchedules
          );
          setDuplicateCheck(duplicateResult);
        } catch (error) {
          console.warn('Duplicate check failed:', error);
        }
      }
      
      setProgress(1.0);
      setProcessingStep(`🎉 AI found ${result.totalMedications} medications!`);
      
      // Navigate to appropriate next step
      if (duplicateCheck?.hasDuplicates) {
        setStep('duplicates');
      } else {
        setStep('confirm');
      }
      
    } catch (error) {
      console.error('AI processing error:', error);
      Alert.alert(
        'AI Processing Error', 
        `AI analysis failed: ${error.message}`,
        [
          { text: 'Test AI', onPress: testWithSampleText },
          { text: 'Retry', onPress: () => setStep('review') },
          { text: 'Manual Entry', onPress: () => navigation.navigate('Meds', { screen: 'AddMed' }) }
        ]
      );
      setStep('review');
    } finally {
      setProcessing(false);
    }
  };

  // Enhanced method to add medications with full notification support
  const addMedicationsToFirebase = async () => {
    setProcessing(true);
    
    try {
      console.log('💊 Adding medications with complete notification system...');
      setProcessingStep('💾 Saving medications to database...');
      
      // Add medications to Firebase with enhanced data
      const medicationsWithIds = [];
      const addPromises = medicationSchedules.map(async (med) => {
        const medicationDoc = await addDoc(collection(db, 'medications'), {
          ...med,
          userId: auth.currentUser.uid,
          createdAt: serverTimestamp(),
          startDate: new Date().toISOString().split('T')[0],
          endDate: calculateEndDate(med.duration),
          // Enhanced fields for notification tracking
          adherenceTracking: true,
          notificationsEnabled: true,
          smsAlertsEnabled: true,
          voiceRemindersEnabled: true,
        });
        
        const medicationWithId = {
          ...med,
          id: medicationDoc.id
        };
        medicationsWithIds.push(medicationWithId);
        return medicationDoc;
      });

      await Promise.all(addPromises);

      setProcessingStep('🔔 Setting up smart reminders and SMS alerts...');
      
      // Schedule medicine reminders with SMS notifications
      const reminderResult = await medicineNotificationService.scheduleMedicineReminders(
        medicationsWithIds,
        auth.currentUser.uid,
        caretakers
      );

      if (reminderResult) {
        console.log('✅ Notifications scheduled successfully');
        setProcessingStep('🎉 Smart reminders and SMS alerts activated!');
        
        // Show comprehensive success message
        Alert.alert(
          '🎉 Complete Setup Successful!',
          `✅ ${medicationSchedules.length} medications added\n🔔 Smart reminders scheduled\n📱 SMS alerts to ${caretakers.length} caretaker(s)\n🔊 Voice reminders enabled\n⚠️ Missed dose detection active`,
          [
            { 
              text: 'Test Notifications', 
              onPress: async () => {
                await medicineNotificationService.testNotificationNow();
              }
            },
            { 
              text: 'Add More Prescriptions', 
              onPress: resetToUpload
            },
            { 
              text: 'View My Medications', 
              onPress: () => navigation.navigate('Meds', { screen: 'MedList' })
            }
          ]
        );
      } else {
        console.warn('⚠️ Notifications setup failed, but medications were added');
        Alert.alert(
          'Partial Success',
          `Medications added but notifications may not work. Check notification permissions.`,
          [
            { text: 'Check Permissions', onPress: () => medicineNotificationService.requestPermissions() },
            { text: 'Continue', onPress: resetToUpload }
          ]
        );
      }

      // Reset system after successful addition
      resetToUpload();
      
    } catch (error) {
      console.error('❌ Error in medication setup:', error);
      Alert.alert(
        'Setup Error', 
        `Failed to complete medication setup: ${error.message}`,
        [
          { text: 'Retry', onPress: addMedicationsToFirebase },
          { text: 'Manual Entry', onPress: () => navigation.navigate('Meds', { screen: 'AddMed' }) }
        ]
      );
    } finally {
      setProcessing(false);
    }
  };

  // Clean reset function
  const resetToUpload = () => {
    // Reset AI system
    aiPrescriptionParser.resetProcessingState();
    
    // Reset screen state
    setSelectedImage(null);
    setExtractedText('');
    setParsedData(null);
    setMedicationSchedules([]);
    setDuplicateCheck(null);
    setStep('upload');
    setProgress(0);
    setProcessingStep('');
  };

  // Handle duplicates
  const handleDuplicates = async (action) => {
    if (action === 'skip_duplicates') {
      setMedicationSchedules(duplicateCheck.unique);
      setStep('confirm');
    } else if (action === 'replace_duplicates') {
      setMedicationSchedules(duplicateCheck.duplicates.concat(duplicateCheck.unique));
      setStep('confirm');
    } else {
      setStep('confirm');
    }
  };

  const calculateEndDate = (duration) => {
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
  };

  const formatTimeFor12Hour = (time24) => {
    if (!time24) return 'Not set';
    try {
      const [hours, minutes] = time24.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
      return time24;
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return '#4CAF50';
    if (confidence >= 0.7) return '#FF9800';
    return '#F44336';
  };

  // Enhanced upload step with notification features
  const renderUploadStep = () => (
    <Surface style={styles.uploadArea} elevation={3}>
      <Text variant="displaySmall" style={styles.uploadIcon}>🤖</Text>
      <Text variant="headlineSmall" style={styles.uploadTitle}>
        AI Prescription Parser
      </Text>
      <Text variant="bodyMedium" style={styles.uploadSubtitle}>
        Upload your prescription and let AI extract and schedule your medications with smart notifications and SMS alerts.
      </Text>
      
      <View style={styles.uploadButtons}>
        <Button
          mode="contained"
          onPress={takePhoto}
          style={styles.uploadButton}
          icon="camera"
          contentStyle={styles.buttonContent}
        >
          Take Photo
        </Button>
        <Button
          mode="outlined"
          onPress={selectImage}
          style={styles.uploadButton}
          icon="image"
          contentStyle={styles.buttonContent}
        >
          Select Image
        </Button>
      </View>

      <Button
        mode="outlined"
        onPress={testWithSampleText}
        style={[styles.uploadButton, { marginBottom: 16 }]}
        icon="robot"
        buttonColor="#E3F2FD"
      >
        🤖 Test AI Analysis
      </Button>

      {/* Enhanced notifications test button */}
      <Button
        mode="outlined"
        onPress={async () => {
          await medicineNotificationService.testNotificationNow();
          setTimeout(async () => {
            await medicineNotificationService.debugScheduledNotifications();
          }, 1000);
        }}
        style={[styles.uploadButton, { marginBottom: 16 }]}
        icon="bell"
        buttonColor="#E8F5E8"
      >
        🔔 Test Notifications & SMS
      </Button>

      <Surface style={styles.freeFeatures} elevation={1}>
        <Text variant="titleMedium" style={styles.featuresTitle}>
          🤖 AI-Powered Features with Smart Notifications
        </Text>
        <View style={styles.featuresList}>
          <Text variant="bodySmall" style={styles.featureItem}>
            🧠 Advanced AI medical document recognition
          </Text>
          <Text variant="bodySmall" style={styles.featureItem}>
            💊 Intelligent medication extraction and scheduling
          </Text>
          <Text variant="bodySmall" style={styles.featureItem}>
            ⏰ Smart dosing time optimization with voice reminders
          </Text>
          <Text variant="bodySmall" style={styles.featureItem}>
            📱 SMS alerts to caretakers for missed doses
          </Text>
          <Text variant="bodySmall" style={styles.featureItem}>
            🔊 Voice confirmations when medicines are taken
          </Text>
          <Text variant="bodySmall" style={styles.featureItem}>
            ⚠️ Missed dose detection and automatic alerts
          </Text>
          <Text variant="bodySmall" style={styles.featureItem}>
            📊 High-confidence AI analysis results
          </Text>
        </View>
        
        {/* Show caretaker info */}
        {caretakers.length > 0 && (
          <View style={styles.caretakerInfo}>
            <Text variant="bodySmall" style={styles.caretakerTitle}>
              📱 SMS Alerts Active for {caretakers.length} caretaker(s)
            </Text>
            {caretakers.slice(0, 2).map((caretaker, index) => (
              <Text key={index} variant="bodySmall" style={styles.caretakerName}>
                • {caretaker.name} ({caretaker.relationship})
              </Text>
            ))}
          </View>
        )}
      </Surface>
    </Surface>
  );

  const renderProcessingStep = () => (
    <Surface style={styles.processingArea} elevation={3}>
      <ActivityIndicator size={60} color="#2196F3" style={styles.spinner} />
      <Text variant="headlineSmall" style={styles.processingTitle}>
        🤖 AI Processing
      </Text>
      <Text variant="bodyMedium" style={styles.processingText}>
        {processingStep}
      </Text>
      <ProgressBar
        progress={progress}
        color="#2196F3"
        style={styles.progressBar}
      />
      <Text variant="bodySmall" style={styles.progressText}>
        {Math.round(progress * 100)}% Complete • AI Analysis in Progress
      </Text>
    </Surface>
  );

  const renderReviewStep = () => (
    <View>
      <Surface style={styles.imagePreview} elevation={2}>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          📸 Prescription Image
        </Text>
        <Image source={{ uri: selectedImage?.uri }} style={styles.prescriptionImage} />
        <View style={styles.imageActions}>
          <Button
            mode="outlined"
            onPress={() => {
              setStep('upload');
              setSelectedImage(null);
            }}
            style={styles.imageAction}
          >
            Change Image
          </Button>
          <Button
            mode="contained"
            onPress={processPrescription}
            style={styles.imageAction}
            loading={processing}
            icon="robot"
          >
            Process with AI
          </Button>
        </View>
      </Surface>
    </View>
  );

  const renderDuplicatesStep = () => (
    <View>
      <Surface style={styles.duplicatesArea} elevation={2}>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          ⚠️ Duplicate Medications Detected
        </Text>
        
        <Text variant="bodyMedium" style={styles.duplicateDescription}>
          We found {duplicateCheck?.duplicates.length} medication(s) that you might already be taking:
        </Text>

        {duplicateCheck?.duplicates.map((med, index) => (
          <Card key={index} style={styles.duplicateCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.duplicateMedName}>
                {med.name}
              </Text>
              <Text variant="bodyMedium">
                Dosage: {med.dosage} • Time: {formatTimeFor12Hour(med.time)}
              </Text>
            </Card.Content>
          </Card>
        ))}

        <View style={styles.duplicateActions}>
          <Button
            mode="outlined"
            onPress={() => handleDuplicates('skip_duplicates')}
            style={styles.duplicateAction}
          >
            Skip Duplicates
          </Button>
          <Button
            mode="contained"
            onPress={() => handleDuplicates('add_all')}
            style={styles.duplicateAction}
          >
            Add All Anyway
          </Button>
        </View>
      </Surface>
    </View>
  );

  const renderConfirmStep = () => (
    <View>
      {/* Processing Summary */}
      <Surface style={styles.summaryCard} elevation={2}>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          🎉 AI Analysis Complete!
        </Text>
        <View style={styles.summaryStats}>
          <Chip style={styles.aiChip} textStyle={{ color: '#fff' }}>
            AI Powered
          </Chip>
          <Chip style={styles.medicationChip}>
            {medicationSchedules.length} Medications Found
          </Chip>
          <Chip style={styles.confidenceChip}>
            {Math.round((parsedData?.confidence || 0.8) * 100)}% Confidence
          </Chip>
          <Chip style={styles.notificationChip} textStyle={{ color: '#fff' }}>
            🔔 Smart Reminders
          </Chip>
          <Chip style={styles.smsChip} textStyle={{ color: '#fff' }}>
            📱 SMS to {caretakers.length} caretaker(s)
          </Chip>
        </View>
      </Surface>

      {/* Enhanced notification features preview */}
      <Surface style={styles.notificationPreview} elevation={2}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          🔔 Smart Notification Features
        </Text>
        <View style={styles.notificationFeatures}>
          <Text variant="bodySmall" style={styles.notificationFeature}>
            ⏰ Daily reminders at scheduled times
          </Text>
          <Text variant="bodySmall" style={styles.notificationFeature}>
            🔊 Voice reminders with medication instructions
          </Text>
          <Text variant="bodySmall" style={styles.notificationFeature}>
            ⚠️ Missed dose alerts after 15 minutes
          </Text>
          <Text variant="bodySmall" style={styles.notificationFeature}>
            📱 SMS alerts to caretakers when doses are missed
          </Text>
          <Text variant="bodySmall" style={styles.notificationFeature}>
            ✅ SMS confirmations when medicines are taken on time
          </Text>
          <Text variant="bodySmall" style={styles.notificationFeature}>
            💾 Complete adherence tracking and logging
          </Text>
        </View>
      </Surface>

      {/* Extracted Text Preview */}
      <Surface style={styles.extractedTextArea} elevation={2}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          📝 Extracted Text
        </Text>
        <Text variant="bodySmall" style={styles.extractedText} numberOfLines={4}>
          {extractedText.substring(0, 200)}...
        </Text>
      </Surface>

      {/* Parsed Medications */}
      <Surface style={styles.medicationsArea} elevation={2}>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          💊 AI-Extracted Medications ({medicationSchedules.length})
        </Text>
        
        {medicationSchedules.length === 0 ? (
          <Card style={styles.noMedicationsCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.noMedicationsText}>
                No medications found
              </Text>
              <Button
                mode="outlined"
                onPress={testWithSampleText}
                style={{ marginTop: 12 }}
                icon="test-tube"
              >
                Test AI Analysis
              </Button>
            </Card.Content>
          </Card>
        ) : (
          medicationSchedules.map((med, index) => (
            <Card key={index} style={styles.medicationCard} elevation={1}>
              <Card.Content>
                <View style={styles.medicationHeader}>
                  <Text variant="titleMedium" style={styles.medicationName}>
                    {med.name}
                  </Text>
                  <View style={styles.medicationMeta}>
                    <Chip style={styles.dosageChip} compact>
                      {med.dosage}
                    </Chip>
                    <Chip 
                      style={[
                        styles.confidenceChip, 
                        { backgroundColor: getConfidenceColor(med.confidence) }
                      ]} 
                      compact
                      textStyle={{ color: '#fff' }}
                    >
                      {Math.round(med.confidence * 100)}% sure
                    </Chip>
                  </View>
                </View>
                
                <View style={styles.medicationDetails}>
                  <Text variant="bodyMedium" style={styles.medicationDetail}>
                    📅 Frequency: {med.frequency}
                  </Text>
                  <Text variant="bodyMedium" style={styles.medicationDetail}>
                    🕐 Time: {formatTimeFor12Hour(med.time)}
                  </Text>
                  {med.duration && (
                    <Text variant="bodyMedium" style={styles.medicationDetail}>
                      ⏱️ Duration: {med.duration}
                    </Text>
                  )}
                  {med.instructions && (
                    <Text variant="bodyMedium" style={styles.medicationDetail}>
                      📋 Instructions: {med.instructions}
                    </Text>
                  )}
                  {/* Add notification preview */}
                  <Text variant="bodySmall" style={styles.notificationPreviewText}>
                    🔔 Will remind at {formatTimeFor12Hour(med.time)} daily with voice & SMS alerts
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ))
        )}

        <View style={styles.confirmActions}>
          <Button
            mode="outlined"
            onPress={() => setStep('review')}
            style={styles.confirmAction}
          >
            Back
          </Button>
          <Button
            mode="contained"
            onPress={addMedicationsToFirebase}
            style={styles.confirmAction}
            loading={processing}
            disabled={medicationSchedules.length === 0}
            icon="check"
          >
            Setup Complete System
          </Button>
        </View>
      </Surface>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          🤖 AI Prescription Parser
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Extract medications with smart notifications & SMS alerts
        </Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {step === 'upload' && renderUploadStep()}
        {step === 'processing' && renderProcessingStep()}
        {step === 'review' && renderReviewStep()}
        {step === 'duplicates' && renderDuplicatesStep()}
        {step === 'confirm' && renderConfirmStep()}
      </ScrollView>

      <FAB
        icon="home"
        style={styles.fab}
        onPress={() => navigation.navigate('Home')}
        label="Home"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 3,
  },
  title: {
    textAlign: 'center',
    color: '#2196F3',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  uploadArea: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
  },
  uploadIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  uploadTitle: {
    color: '#2196F3',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  uploadSubtitle: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    width: '100%',
  },
  uploadButton: {
    flex: 1,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  freeFeatures: {
    width: '100%',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
  },
  featuresTitle: {
    color: '#1976D2',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    color: '#1976D2',
    lineHeight: 16,
  },
  caretakerInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F3E5F5',
    borderRadius: 8,
  },
  caretakerTitle: {
    color: '#7B1FA2',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  caretakerName: {
    color: '#7B1FA2',
  },
  processingArea: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 48,
    alignItems: 'center',
  },
  spinner: {
    marginBottom: 24,
  },
  processingTitle: {
    color: '#2196F3',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  processingText: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  progressText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  imagePreview: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#2196F3',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  prescriptionImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  imageActions: {
    flexDirection: 'row',
    gap: 12,
  },
  imageAction: {
    flex: 1,
  },
  duplicatesArea: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  duplicateDescription: {
    marginBottom: 16,
    color: '#666',
  },
  duplicateCard: {
    marginBottom: 8,
    backgroundColor: '#FFF3E0',
  },
  duplicateMedName: {
    color: '#F57C00',
    fontWeight: 'bold',
  },
  duplicateActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  duplicateAction: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  aiChip: {
    backgroundColor: '#2196F3',
  },
  medicationChip: {
    backgroundColor: '#4CAF50',
  },
  confidenceChip: {
    backgroundColor: '#FF9800',
  },
  notificationChip: {
    backgroundColor: '#FF9800',
  },
  smsChip: {
    backgroundColor: '#9C27B0',
  },
  notificationPreview: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  notificationFeatures: {
    gap: 6,
  },
  notificationFeature: {
    color: '#4CAF50',
    lineHeight: 18,
  },
  extractedTextArea: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  extractedText: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  medicationsArea: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  medicationCard: {
    marginBottom: 12,
    elevation: 1,
  },
  noMedicationsCard: {
    backgroundColor: '#FFF3E0',
    marginBottom: 16,
  },
  noMedicationsText: {
    color: '#F57C00',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  medicationHeader: {
    marginBottom: 12,
  },
  medicationName: {
    color: '#2196F3',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  medicationMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  dosageChip: {
    backgroundColor: '#E3F2FD',
  },
  medicationDetails: {
    gap: 4,
    marginBottom: 12,
  },
  medicationDetail: {
    color: '#666',
  },
  notificationPreviewText: {
    color: '#4CAF50',
    fontStyle: 'italic',
    marginTop: 8,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  confirmAction: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
});
