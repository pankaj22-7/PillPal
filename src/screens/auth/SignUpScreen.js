import React, { useState } from 'react';
import { ScrollView, StyleSheet, Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Text, TextInput, Button, HelperText } from 'react-native-paper';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { medicineNotificationService } from '../../services/medicineNotificationService';


export default function SignUpScreen({ navigation }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.name.trim()) {
      newErrors.name = 'Full name is required';
    }
    
    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!form.password) {
      newErrors.password = 'Password is required';
    } else if (form.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        form.email, 
        form.password
      );
      const user = userCredential.user;

      // Update user display name
      await updateProfile(user, {
        displayName: form.name
      });

      // Create user profile document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
  name: form.name,
  email: form.email,
  phone: '',
  emergencyContact: '',
  age: '',
  preferences: {
    voiceReminders: true,
    smsAlerts: true,
    reminderTone: 'default',
  },
  profileCompleted: false, // Will be completed in ProfileSetup
  createdAt: serverTimestamp(),
});
await medicineNotificationService.initialize();

console.log('✅ User registered with automatic Firestore setup');
      // Navigation will be handled automatically by AuthNavigator
      
    } catch (error) {
      console.error('Signup error:', error);
      let errorMessage = 'Failed to create account. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please use a different email or try logging in.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      }
      
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  }; // ✅ Make sure this closing brace is here

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineMedium" style={styles.title}>
              Create Account
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Join PillPal to start managing your medications
            </Text>

            <TextInput
              label="Full Name"
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
              label="Email Address"
              value={form.email}
              onChangeText={(email) => setForm({ ...form, email })}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              error={!!errors.email}
            />
            <HelperText type="error" visible={!!errors.email}>
              {errors.email}
            </HelperText>

            <TextInput
              label="Password"
              value={form.password}
              onChangeText={(password) => setForm({ ...form, password })}
              mode="outlined"
              secureTextEntry
              style={styles.input}
              error={!!errors.password}
            />
            <HelperText type="error" visible={!!errors.password}>
              {errors.password}
            </HelperText>

            <TextInput
              label="Confirm Password"
              value={form.confirmPassword}
              onChangeText={(confirmPassword) => setForm({ ...form, confirmPassword })}
              mode="outlined"
              secureTextEntry
              style={styles.input}
              error={!!errors.confirmPassword}
            />
            <HelperText type="error" visible={!!errors.confirmPassword}>
              {errors.confirmPassword}
            </HelperText>

            <Button
              mode="contained"
              onPress={handleSignUp}
              loading={loading}
              disabled={loading}
              style={styles.signUpButton}
            >
              Create Account
            </Button>

            <View style={styles.loginContainer}>
              <Text variant="bodyMedium">
                Already have an account?{' '}
              </Text>
              <Button
                mode="text"
                onPress={() => navigation.navigate('Login')}
                compact
              >
                Sign In
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
} // ✅ Make sure this closing brace is here for the component

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
  input: {
    marginBottom: 8,
  },
  signUpButton: {
    marginTop: 16,
    marginBottom: 16,
    paddingVertical: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
});
