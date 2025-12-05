// src/screens/ai/PrescriptionParserScreen.js
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Card, Text, Button, FAB, Surface, 
  ActivityIndicator, Chip, IconButton 
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { prescriptionParser } from '../../services/prescriptionParser';
import { medicationScheduler } from '../../services/medicationScheduler';
import { prescriptionSpecificParser } from '../../services/enhancedOCRPrescriptionParser';

export default function PrescriptionParserScreen({ navigation }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [parsedMedications, setParsedMedications] = useState([]);
  const [step, setStep] = useState('upload'); // upload, processing, review, confirm

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

 const processPrescription = async () => {
  if (!selectedImage) return;

  setProcessing(true);
  setStep('processing');
  setProgress(0);
  
  try {
    setProcessingStep('🔍 Extracting text from prescription...');
    setProgress(0.3);
    
    setProcessingStep('💊 Parsing medications with prescription-specific patterns...');
    setProgress(0.6);
    
    const result = await prescriptionSpecificParser.processPrescriptionImage(
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
    
    console.log('🎯 Processing result:', result);
    
    if (result.totalMedications === 0) {
      Alert.alert(
        'No Medications Found',
        'Could not extract medications from this prescription. Please try a clearer image or enter medications manually.',
        [
          { text: 'Retry', onPress: () => setStep('review') },
          { text: 'Manual Entry', onPress: () => navigation.navigate('Meds', { screen: 'AddMed' }) }
        ]
      );
      return;
    }
    
    setExtractedText(result.extractedText);
    setParsedData(result.parsedData);
    setMedicationSchedules(result.medicationSchedules);
    
    setProgress(1.0);
    setProcessingStep(`🎉 Found ${result.totalMedications} medications!`);
    setStep('confirm');
    
  } catch (error) {
    console.error('Processing error:', error);
    Alert.alert(
      'Processing Error', 
      `Failed to extract medications: ${error.message}`,
      [
        { text: 'Retry', onPress: () => setStep('review') },
        { text: 'Manual Entry', onPress: () => navigation.navigate('Meds', { screen: 'AddMed' }) }
      ]
    );
    setStep('review');
  } finally {
    setProcessing(false);
  }
};
  const renderUploadStep = () => (
    <Surface style={styles.uploadArea} elevation={2}>
      <Text variant="headlineSmall" style={styles.uploadTitle}>
        📋 Upload Your Prescription
      </Text>
      <Text variant="bodyMedium" style={styles.uploadSubtitle}>
        Take a photo or select an image of your prescription
      </Text>
      
      <View style={styles.uploadButtons}>
        <Button
          mode="contained"
          onPress={takePhoto}
          style={styles.uploadButton}
          icon="camera"
        >
          Take Photo
        </Button>
        <Button
          mode="outlined"
          onPress={selectImage}
          style={styles.uploadButton}
          icon="image"
        >
          Select Image
        </Button>
      </View>
    </Surface>
  );

  const renderProcessingStep = () => (
    <Surface style={styles.processingArea} elevation={2}>
      <ActivityIndicator size="large" color="#2196F3" style={styles.spinner} />
      <Text variant="titleLarge" style={styles.processingTitle}>
        🤖 AI Processing Prescription
      </Text>
      <Text variant="bodyMedium" style={styles.processingText}>
        Extracting medication information and creating schedules...
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
        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            onPress={() => setStep('upload')}
            style={styles.actionButton}
          >
            Change Image
          </Button>
          <Button
            mode="contained"
            onPress={processPrescription}
            style={styles.actionButton}
            loading={processing}
          >
            Process Prescription
          </Button>
        </View>
      </Surface>
    </View>
  );

  const renderConfirmStep = () => (
    <View>
      {/* Extracted Text */}
      <Surface style={styles.extractedTextArea} elevation={2}>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          📝 Extracted Text
        </Text>
        <Text variant="bodySmall" style={styles.extractedText}>
          {extractedText}
        </Text>
      </Surface>

      {/* Parsed Medications */}
      <Surface style={styles.medicationsArea} elevation={2}>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          💊 Identified Medications ({parsedMedications.length})
        </Text>
        
        {parsedMedications.map((med, index) => (
          <Card key={index} style={styles.medicationCard}>
            <Card.Content>
              <View style={styles.medicationHeader}>
                <Text variant="titleMedium" style={styles.medicationName}>
                  {med.name}
                </Text>
                <Chip style={styles.dosageChip}>{med.dosage}</Chip>
              </View>
              
              <Text variant="bodyMedium" style={styles.medicationDetail}>
                📅 Frequency: {med.frequency}
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
              
              {/* Suggested Times */}
              <View style={styles.timesContainer}>
                <Text variant="bodySmall" style={styles.timesLabel}>
                  🕐 Suggested Times:
                </Text>
                <View style={styles.timesRow}>
                  {medicationScheduler.generateScheduleTimes(med.frequency).map((time, i) => (
                    <Chip key={i} style={styles.timeChip} compact>
                      {time}
                    </Chip>
                  ))}
                </View>
              </View>
            </Card.Content>
          </Card>
        ))}

        <View style={styles.confirmButtons}>
          <Button
            mode="outlined"
            onPress={() => setStep('review')}
            style={styles.confirmButton}
          >
            Back
          </Button>
          <Button
            mode="contained"
            onPress={confirmAndAddMedications}
            style={styles.confirmButton}
            loading={processing}
            disabled={parsedMedications.length === 0}
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

      <ScrollView contentContainerStyle={styles.content}>
        {step === 'upload' && renderUploadStep()}
        {step === 'processing' && renderProcessingStep()}
        {step === 'review' && renderReviewStep()}
        {step === 'confirm' && renderConfirmStep()}
      </ScrollView>

      <FAB
        icon="home"
        style={styles.fab}
        onPress={() => navigation.navigate('Home')}
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
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  uploadTitle: {
    color: '#2196F3',
    marginBottom: 8,
    textAlign: 'center',
  },
  uploadSubtitle: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadButton: {
    flex: 1,
  },
  processingArea: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  spinner: {
    marginBottom: 20,
  },
  processingTitle: {
    color: '#2196F3',
    marginBottom: 8,
    textAlign: 'center',
  },
  processingText: {
    color: '#666',
    textAlign: 'center',
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
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
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  medicationName: {
    color: '#2196F3',
    fontWeight: 'bold',
    flex: 1,
  },
  dosageChip: {
    backgroundColor: '#E3F2FD',
  },
  medicationDetail: {
    color: '#666',
    marginBottom: 4,
  },
  timesContainer: {
    marginTop: 8,
  },
  timesLabel: {
    color: '#666',
    marginBottom: 4,
  },
  timesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  timeChip: {
    backgroundColor: '#4CAF50',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  confirmButton: {
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
