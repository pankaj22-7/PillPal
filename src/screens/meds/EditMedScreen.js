import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput, Button, Text, Card, Chip, HelperText, TouchableRipple } from 'react-native-paper';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { uploadToCloudinary } from '../../services/cloudinary';

export default function EditMedScreen({ navigation, route }) {
  const { medication, medicationId } = route.params;
  
  const [form, setForm] = useState({
    name: medication?.name || '',
    dosage: medication?.dosage || '',
    frequency: medication?.frequency || 'daily',
    time: medication?.time || '',
    notes: medication?.notes || '',
    instructions: medication?.instructions || '',
    photoUri: null,
    existingPhotoUrl: medication?.photoUrl || null
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
    
    if (errors.time) {
      setErrors({ ...errors, time: null });
    }
  };

  const handleAddPhoto = async () => {
    Alert.alert(
      'Update Photo',
      'Choose how to update your medication photo',
      [
        { text: 'Camera', onPress: () => takePhoto() },
        { text: 'Gallery', onPress: () => pickFromGallery() },
        { text: 'Remove Photo', onPress: () => removePhoto() },
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

  const removePhoto = () => {
    setForm({ ...form, photoUri: null, existingPhotoUrl: null });
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      let photoUrl = form.existingPhotoUrl; // Keep existing photo by default
      
      // If user selected a new photo
      if (form.photoUri) {
        try {
          const { secure_url } = await uploadToCloudinary(form.photoUri);
          photoUrl = secure_url;
        } catch (cloudinaryError) {
          console.warn('Photo upload failed:', cloudinaryError);
          // Continue with existing photo
        }
      }
      
      // If user removed photo
      if (form.photoUri === null && form.existingPhotoUrl === null) {
        photoUrl = null;
      }

      // Update medication in Firestore
      const medicationDoc = doc(db, 'medications', medicationId);
      await updateDoc(medicationDoc, {
        name: form.name,
        dosage: form.dosage,
        frequency: form.frequency,
        time: form.time,
        instructions: form.instructions,
        notes: form.notes,
        photoUrl,
        updatedAt: serverTimestamp()
      });

      Alert.alert('Success', 'Medication updated successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating medication:', error);
      Alert.alert('Error', 'Failed to update medication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Medication',
      'Are you sure you want to delete this medication? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const medicationDoc = doc(db, 'medications', medicationId);
              await updateDoc(medicationDoc, {
                isActive: false,
                deletedAt: serverTimestamp()
              });
              Alert.alert('Success', 'Medication deleted successfully!');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting medication:', error);
              Alert.alert('Error', 'Failed to delete medication.');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Edit Medication
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

            {/* Time Picker */}
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
              {form.photoUri || form.existingPhotoUrl ? 'Change Photo' : 'Add Photo'}
            </Button>

            <View style={styles.buttonRow}>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={loading}
                disabled={loading}
                style={styles.saveButton}
                icon="content-save"
              >
                Update Medication
              </Button>
              
              <Button
                mode="outlined"
                onPress={handleDelete}
                style={styles.deleteButton}
                textColor="#F44336"
                icon="delete"
              >
                Delete
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <DateTimePickerModal
        isVisible={isTimePickerVisible}
        mode="time"
        onConfirm={handleTimeConfirm}
        onCancel={hideTimePicker}
        is24Hour={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12
  },
  saveButton: { 
    flex: 1
  },
  deleteButton: {
    flex: 0.4,
    borderColor: '#F44336'
  }
});
