import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Alert, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Card, Text, Button, FAB, Surface, 
  ActivityIndicator, Chip, IconButton, ProgressBar 
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { aiPrescriptionParser } from '../../services/aiPrescriptionParser';
import { medicationValidator } from '../../services/medicationValidator';

const { width } = Dimensions.get('window');

export default function AIPrescriptionParserScreen({ navigation }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [medicationSchedules, setMedicationSchedules] = useState([]);
  const [duplicateCheck, setDuplicateCheck] = useState(null);
  const [step, setStep] = useState('upload'); // upload, processing, review, duplicates, confirm

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

  // Step 2: Process Prescription with AI
  const processPrescription = async () => {
    if (!selectedImage) return;

    setProcessing(true);
    setStep('processing');
    setProgress(0);
    
    try {
      // Step 1: Text extraction
      setProcessingStep('Extracting text from prescription...');
      setProgress(0.3);
      
      const result = await aiPrescriptionParser.processPrescriptionImage(
        selectedImage.uri,
        {
          wakeTime: '08:00',
          bedTime: '22:00',
          mealTimes: {
            breakfast: '08:00',
            lunch: '13:00',
            dinner: '19:00'
          }
        }
      );
      
      // Step 2: Parsing medications
      setProcessingStep('Parsing medication information...');
      setProgress(0.6);
      
      setExtractedText(result.extractedText);
      setParsedData(result.parsedData);
      setMedicationSchedules(result.medicationSchedules);
      
      // Step 3: Check for duplicates
      setProcessingStep('Checking for duplicate medications...');
      setProgress(0.9);
      
      const duplicateResult = await medicationValidator.checkForDuplicates(
        result.medicationSchedules
      );
      setDuplicateCheck(duplicateResult);
      
      setProgress(1.0);
      setProcessingStep('Processing complete!');
      
      // Navigate to appropriate next step
      if (duplicateResult.hasDuplicates) {
        setStep('duplicates');
      } else {
        setStep('confirm');
      }
      
    } catch (error) {
      console.error('Error processing prescription:', error);
      Alert.alert('Processing Error', 'Failed to process prescription. Please try again or enter medication manually.');
      setStep('review');
    } finally {
      setProcessing(false);
    }
  };

  // Step 3: Handle duplicates
  const handleDuplicates = async (action) => {
    if (action === 'skip_duplicates') {
      setMedicationSchedules(duplicateCheck.unique);
      setStep('confirm');
    } else if (action === 'replace_duplicates') {
      // Add logic to replace existing medications
      setMedicationSchedules(duplicateCheck.duplicates.concat(duplicateCheck.unique));
      setStep('confirm');
    } else {
      setStep('confirm'); // Proceed with all medications
    }
  };

  // Step 4: Add medications to Firebase
  const addMedicationsToFirebase = async () => {
    setProcessing(true);
    
    try {
      const addPromises = medicationSchedules.map(med => 
        addDoc(collection(db, 'medications'), {
          ...med,
          userId: auth.currentUser.uid,
          createdAt: serverTimestamp(),
          startDate: new Date().toISOString().split('T')[0],
          endDate: calculateEndDate(med.duration)
        })
      );

      await Promise.all(addPromises);

      Alert.alert(
        'Success! 🎉', 
        `${medicationSchedules.length} medications added to your schedule`,
        [{ 
          text: 'View My Medications', 
          onPress: () => navigation.navigate('Meds', { screen: 'MedList' })
        }]
      );
      
    } catch (error) {
      console.error('Error adding medications:', error);
      Alert.alert('Error', 'Failed to add medications. Please try again.');
    } finally {
      setProcessing(false);
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

  // Format time to 12-hour format
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

  // Render functions for different steps
  const renderUploadStep = () => (
    <Surface style={styles.uploadArea} elevation={3}>
      <Text variant="displaySmall" style={styles.uploadIcon}>📋</Text>
      <Text variant="headlineSmall" style={styles.uploadTitle}>
        Upload Your Prescription
      </Text>
      <Text variant="bodyMedium" style={styles.uploadSubtitle}>
        Take a photo or select an image of your prescription.{'\n'}
        Our AI will automatically extract and schedule your medications.
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

      <View style={styles.aiFeatures}>
        <Text variant="titleMedium" style={styles.featuresTitle}>
          ✨ AI Features
        </Text>
        <View style={styles.featuresList}>
          <Text variant="bodySmall" style={styles.featureItem}>
            🔍 Smart text recognition from handwritten prescriptions
          </Text>
          <Text variant="bodySmall" style={styles.featureItem}>
            💊 Automatic medication name and dosage extraction
          </Text>
          <Text variant="bodySmall" style={styles.featureItem}>
            ⏰ Intelligent scheduling based on frequency
          </Text>
          <Text variant="bodySmall" style={styles.featureItem}>
            🔄 Duplicate detection and validation
          </Text>
        </View>
      </View>
    </Surface>
  );

  const renderProcessingStep = () => (
    <Surface style={styles.processingArea} elevation={3}>
      <ActivityIndicator size={60} color="#2196F3" style={styles.spinner} />
      <Text variant="headlineSmall" style={styles.processingTitle}>
        🤖 AI Processing Prescription
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
        {Math.round(progress * 100)}% Complete
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
      {/* Extracted Text Preview */}
      <Surface style={styles.extractedTextArea} elevation={2}>
        <View style={styles.collapsibleHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            📝 Extracted Text
          </Text>
        </View>
        <Text variant="bodySmall" style={styles.extractedText} numberOfLines={3}>
          {extractedText}
        </Text>
      </Surface>

      {/* Parsed Medications */}
      <Surface style={styles.medicationsArea} elevation={2}>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          💊 Identified Medications ({medicationSchedules.length})
        </Text>
        
        {medicationSchedules.map((med, index) => (
          <Card key={index} style={styles.medicationCard} elevation={1}>
            <Card.Content>
              <View style={styles.medicationHeader}>
                <View style={styles.medicationMainInfo}>
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
                        med.confidence > 0.9 ? styles.highConfidence : styles.lowConfidence
                      ]} 
                      compact
                    >
                      {Math.round(med.confidence * 100)}% sure
                    </Chip>
                  </View>
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
              </View>

              {med.requiresVerification && (
                <Surface style={styles.verificationWarning} elevation={1}>
                  <Text variant="bodySmall" style={styles.warningText}>
                    ⚠️ Please verify this medication information before confirming
                  </Text>
                </Surface>
              )}
            </Card.Content>
          </Card>
        ))}

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
            Add to My Medications
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
          Automatically extract and schedule medications from prescriptions
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
    marginBottom: 32,
    width: '100%',
  },
  uploadButton: {
    flex: 1,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  aiFeatures: {
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
    backgroundColor
