import React, { useState } from 'react';
import { ScrollView, StyleSheet, Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Text, TextInput, Button, HelperText, Switch } from 'react-native-paper';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

export default function ProfileSetupScreen({ navigation }) {
  const [form, setForm] = useState({
    phone: '',
    age: '',
    emergencyContact: '',
    caretakerName: '',
    caretakerPhone: '',
    caretakerRelationship: 'Family',
    caretakerEmail: '',
  });
  const [loading, setLoading] = useState(false);
  const [enableSMSAlerts, setEnableSMSAlerts] = useState(true);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (enableSMSAlerts) {
      if (!form.caretakerName.trim()) {
        newErrors.caretakerName = 'Caretaker name is required for SMS alerts';
      }
      if (!form.caretakerPhone.trim()) {
        newErrors.caretakerPhone = 'Caretaker phone is required for SMS alerts';
      } else if (!/^\+?[\d\s\-()]+$/.test(form.caretakerPhone)) {
        newErrors.caretakerPhone = 'Please enter a valid phone number (include country code)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ Automatic Firestore Collection Setup
  const completeProfileSetup = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      console.log('🔄 Setting up complete PillPal profile with Firestore collections...');

      // ✅ Create/Update user profile (creates 'users' collection automatically)
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        name: auth.currentUser.displayName || 'PillPal User',
        email: auth.currentUser.email,
        phone: form.phone,
        age: form.age,
        emergencyContact: form.emergencyContact,
        preferences: {
          voiceReminders: true,
          smsAlerts: enableSMSAlerts,
          reminderTone: 'default',
          voiceLanguage: 'en-US',
          missedDoseTimeout: 15,
          snoozeInterval: 5,
        },
        profileCompleted: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log('✅ User profile created in Firestore');

      // ✅ Add caretaker if SMS alerts enabled (creates 'caretakers' collection automatically)
      if (enableSMSAlerts && form.caretakerName && form.caretakerPhone) {
        await addDoc(collection(db, 'caretakers'), {
          userId: auth.currentUser.uid,
          name: form.caretakerName,
          phone: form.caretakerPhone.startsWith('+') ? form.caretakerPhone : `+1${form.caretakerPhone}`,
          relationship: form.caretakerRelationship,
          email: form.caretakerEmail,
          active: true,
          notificationPreferences: {
            missedDoses: true,
            takenConfirmations: true,
            weeklyReports: false,
          },
          createdAt: serverTimestamp(),
        });

        console.log('✅ Caretaker added to Firestore');
      }

      Alert.alert(
        '🎉 Profile Setup Complete!',
        `Welcome to PillPal! Your profile is ready with:\n• Medicine reminders\n• Voice notifications\n${enableSMSAlerts ? '• SMS alerts to caretaker' : '• SMS alerts disabled'}\n\nYou can now start adding medications!`,
        [
          {
            text: 'Add Medications',
            onPress: () => navigation.navigate('Main', { screen: 'FreeAI' })
          },
          {
            text: 'Go to Dashboard',
            onPress: () => navigation.navigate('Main')
          }
        ]
      );

    } catch (error) {
      console.error('❌ Profile setup error:', error);
      Alert.alert('Setup Error', 'Failed to complete profile setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card} elevation={4}>
          <Card.Content style={styles.cardContent}>
            <Text variant="headlineSmall" style={styles.title}>
              Complete Your PillPal Profile
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Set up your medication management system with smart notifications
            </Text>

            {/* Personal Information */}
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Personal Information
            </Text>

            <TextInput
              label="Phone Number"
              value={form.phone}
              onChangeText={(phone) => setForm({ ...form, phone })}
              mode="outlined"
              style={styles.input}
              keyboardType="phone-pad"
              placeholder="+1234567890"
            />

            <TextInput
              label="Age"
              value={form.age}
              onChangeText={(age) => setForm({ ...form, age })}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
            />

            <TextInput
              label="Emergency Contact"
              value={form.emergencyContact}
              onChangeText={(emergencyContact) => setForm({ ...form, emergencyContact })}
              mode="outlined"
              style={styles.input}
              placeholder="Name and phone number"
            />

            {/* SMS Alerts Section */}
            <View style={styles.smsSection}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                SMS Alerts for Caretakers
              </Text>
              <View style={styles.switchRow}>
                <Text variant="bodyMedium" style={styles.switchLabel}>
                  Enable SMS alerts when medicines are missed
                </Text>
                <Switch
                  value={enableSMSAlerts}
                  onValueChange={setEnableSMSAlerts}
                  color="#4CAF50"
                />
              </View>
            </View>

            {enableSMSAlerts && (
              <View style={styles.caretakerSection}>
                <TextInput
                  label="Caretaker Name *"
                  value={form.caretakerName}
                  onChangeText={(caretakerName) => setForm({ ...form, caretakerName })}
                  mode="outlined"
                  style={styles.input}
                  error={!!errors.caretakerName}
                />
                <HelperText type="error" visible={!!errors.caretakerName}>
                  {errors.caretakerName}
                </HelperText>

                <TextInput
                  label="Caretaker Phone *"
                  value={form.caretakerPhone}
                  onChangeText={(caretakerPhone) => setForm({ ...form, caretakerPhone })}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="phone-pad"
                  placeholder="+1234567890"
                  error={!!errors.caretakerPhone}
                />
                <HelperText type="error" visible={!!errors.caretakerPhone}>
                  {errors.caretakerPhone}
                </HelperText>

                <TextInput
                  label="Relationship"
                  value={form.caretakerRelationship}
                  onChangeText={(caretakerRelationship) => setForm({ ...form, caretakerRelationship })}
                  mode="outlined"
                  style={styles.input}
                  placeholder="Family, Friend, Nurse, etc."
                />

                <TextInput
                  label="Caretaker Email (Optional)"
                  value={form.caretakerEmail}
                  onChangeText={(caretakerEmail) => setForm({ ...form, caretakerEmail })}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            )}

            <Button
              mode="contained"
              onPress={completeProfileSetup}
              style={styles.completeButton}
              loading={loading}
              disabled={loading}
              buttonColor="#4CAF50"
            >
              Complete PillPal Setup
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    elevation: 4,
  },
  cardContent: {
    padding: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    color: '#666666',
  },
  sectionTitle: {
    color: '#4CAF50',
    marginBottom: 16,
    marginTop: 8,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 8,
  },
  smsSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
  },
  caretakerSection: {
    backgroundColor: '#F3E5F5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  completeButton: {
    marginTop: 24,
    paddingVertical: 8,
  },
});
