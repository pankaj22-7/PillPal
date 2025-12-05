import React, { useState } from 'react';
import { ScrollView, StyleSheet, Alert, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput, Button, Text, Card, Chip, HelperText, TouchableRipple } from 'react-native-paper';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { uploadToCloudinary } from '../../services/cloudinary';
import { scheduleReminder } from '../../services/notifications';

export default function AddMedScreen({ navigation }) {
  const [form, setForm] = useState({
    name: '', dosage: '', frequency: 'daily', time: '', 
    notes: '', photoUri: null, instructions: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isTimePickerVisible, setTimePickerVisibility] = useState(false);

  const frequencies = ['daily', 'twice daily', 'three times daily', 'weekly', 'as needed'];
  
  const validateForm = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Medication name is required';
    if (!form.dosage.trim()) newErrors.dosage = 'Dosage is required';
    if (!form.time.trim()) newErrors.time = 'Time is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Convert 24-hour format to 12-hour format for display
  const formatTimeFor12Hour = (time24) => {
    if (!time24) return '';
    
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Convert 12-hour format back to 24-hour for storage
  const formatTimeTo24Hour = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const showTimePicker = () => {
    setTimePickerVisibility(true);
  };

  const hideTimePicker = () => {
    setTimePickerVisibility(false);
  };

  const handleTimeConfirm = (selectedTime) => {
    const time24 = formatTimeTo24Hour(selectedTime);
    setForm({ ...form, time: time24 });
    hideTimePicker();
    
    // Clear time error if it exists
    if (errors.time) {
      setErrors({ ...errors, time: null });
    }
  };

  const handleAddPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos');
      return;
    }

    Alert.alert(
      'Add Photo',
      'Choose how to add a photo of your medication',
      [
        { text: 'Camera', onPress: () => takePhoto() },
        { text: 'Gallery', onPress: () => pickFromGallery() },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8, allowsEditing: true, aspect: [4, 3]
    });
    if (!result.canceled) {
      setForm({ ...form, photoUri: result.assets[0].uri });
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8, allowsEditing: true, aspect: [4, 3]
    });
    if (!result.canceled) {
      setForm({ ...form, photoUri: result.assets[0].uri });
    }
  };

  // ✅ FIXED: Make sure the function is properly async
const handleSave = async () => {
  if (!validateForm()) return;
  
  setLoading(true);
  try {
    let photoUrl = null;
    
    if (form.photoUri) {
      try {
        const { secure_url } = await uploadToCloudinary(form.photoUri);
        photoUrl = secure_url;
        console.log('Photo uploaded successfully:', photoUrl);
      } catch (cloudinaryError) {
        console.warn('Photo upload failed:', cloudinaryError);
        photoUrl = null;
      }
    }

    // ✅ FIXED: Properly structure the data object
    const medicationData = {
      name: form.name,
      dosage: form.dosage,
      frequency: form.frequency,
      time: form.time,
      instructions: form.instructions,
      notes: form.notes,
      photoUrl,
      userId: auth.currentUser.uid,
      createdAt: serverTimestamp(),
      isActive: true
    };

    console.log('Saving medication ', medicationData);

    // Add to Firestore
    const docRef = await addDoc(collection(db, 'medications'), medicationData);
    console.log('Medication saved successfully:', docRef.id);

    // Schedule notification
    try {
      const reminderDateTime = new Date();
      const [hours, minutes] = form.time.split(':');
      reminderDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      await scheduleReminder(
        reminderDateTime.toISOString(),
        'Medication Reminder',
        `Time to take ${form.name} - ${form.dosage}`
      );
    } catch (notificationError) {
      console.warn('Notification scheduling failed:', notificationError);
    }

    Alert.alert('Success', 'Medication added successfully!');
    navigation.goBack();
  } catch (error) {
    console.error('Error adding medication:', error);
    Alert.alert('Error', `Failed to add medication: ${error.message}`);
  } finally {
    setLoading(false);
  }
};


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Add New Medication
        </Text>

        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="Medication Name *"
              value={form.name}
              onChangeText={(name) => setForm({ ...form, name })}
              mode="outlined"
              style={styles.input}
              error={!!errors.name}
            />
            <HelperText type="error" visible={!!errors.name}>
              {errors.name}
            </HelperText>

            <TextInput
              label="Dosage (e.g., 10mg, 1 tablet) *"
              value={form.dosage}
              onChangeText={(dosage) => setForm({ ...form, dosage })}
              mode="outlined"
              style={styles.input}
              error={!!errors.dosage}
            />
            <HelperText type="error" visible={!!errors.dosage}>
              {errors.dosage}
            </HelperText>

            <Text variant="titleMedium" style={styles.sectionTitle}>
              Frequency
            </Text>
            <View style={styles.chipContainer}>
              {frequencies.map((freq) => (
                <Chip
                  key={freq}
                  selected={form.frequency === freq}
                  onPress={() => setForm({ ...form, frequency: freq })}
                  style={styles.chip}
                  mode={form.frequency === freq ? 'flat' : 'outlined'}
                >
                  {freq}
                </Chip>
              ))}
            </View>

            {/* Time Picker Section */}
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Reminder Time *
            </Text>
            <TouchableRipple
              onPress={showTimePicker}
              style={[
                styles.timePickerButton,
                errors.time && styles.timePickerError
              ]}
            >
              <View style={styles.timePickerContent}>
                <Text variant="bodyLarge" style={styles.timePickerText}>
                  {form.time ? formatTimeFor12Hour(form.time) : 'Select Time'}
                </Text>
                <Text variant="bodyLarge" style={styles.timePickerIcon}>
                  🕐
                </Text>
              </View>
            </TouchableRipple>
            <HelperText type="error" visible={!!errors.time}>
              {errors.time}
            </HelperText>

            <TextInput
              label="Instructions"
              value={form.instructions}
              onChangeText={(instructions) => setForm({ ...form, instructions })}
              mode="outlined"
              placeholder="Take with food, after meals, etc."
              style={styles.input}
            />

            <TextInput
              label="Notes"
              value={form.notes}
              onChangeText={(notes) => setForm({ ...form, notes })}
              mode="outlined"
              multiline
              numberOfLines={3}
              placeholder="Additional notes about this medication"
              style={styles.input}
            />

            <Button
              mode="outlined"
              onPress={handleAddPhoto}
              icon="camera"
              style={styles.photoButton}
            >
              {form.photoUri ? 'Change Photo' : 'Add Pill Photo'}
            </Button>
            {form.photoUri && (
              <HelperText type="info" visible={true}>
                Photo added successfully ✓
              </HelperText>
            )}

            <Button
              mode="contained"
              onPress={handleSave}
              loading={loading}
              disabled={loading}
              style={styles.saveButton}
              icon="content-save"
            >
              Save Medication
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Time Picker Modal */}
      <DateTimePickerModal
        isVisible={isTimePickerVisible}
        mode="time"
        onConfirm={handleTimeConfirm}
        onCancel={hideTimePicker}
        is24Hour={false} // This shows 12-hour format in picker
        headerTextIOS="Pick a time"
        confirmTextIOS="Confirm"
        cancelTextIOS="Cancel"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#75cee1ff' 
  },
  content: { 
    padding: 16 
  },
  title: { 
    marginBottom: 20, 
    textAlign: 'center', 
    color: '#2196F3',
    fontWeight: 'bold'
  },
  card: { 
    marginBottom: 20,
    elevation: 4
  },
  input: { 
    marginBottom: 8 
  },
  sectionTitle: { 
    marginTop: 16, 
    marginBottom: 12,
    color: '#2196F3'
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16
  },
  chip: { 
    marginRight: 8, 
    marginBottom: 8 
  },
  timePickerButton: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 4,
    padding: 16,
    backgroundColor: 'white',
    marginBottom: 8
  },
  timePickerError: {
    borderColor: '#d32f2f'
  },
  timePickerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  timePickerText: {
    color: '#333333',
    fontSize: 16
  },
  timePickerIcon: {
    fontSize: 20
  },
  photoButton: { 
    marginVertical: 16 
  },
  saveButton: { 
    marginTop: 16,
    paddingVertical: 8
  },
});
