import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Text, Avatar, Button, TextInput, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

export default function ProfileScreen({ navigation }) {
  const user = auth.currentUser;
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.displayName || 'User',
    email: user?.email || '',
    phone: '',
    emergencyContact: '',
    age: '',
  });

  // ✅ Load profile data from Firestore on component mount
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      if (user?.uid) {
        const profileDoc = await getDoc(doc(db, 'users', user.uid));
        if (profileDoc.exists()) {
          const firestoreData = profileDoc.data();
          setProfileData({
            name: firestoreData.name || user.displayName || 'User',
            email: firestoreData.email || user.email || '',
            phone: firestoreData.phone || '',
            emergencyContact: firestoreData.emergencyContact || '',
            age: firestoreData.age || '',
          });
          console.log('✅ Profile data loaded from Firestore:', firestoreData);
        } else {
          console.log('No profile document found, using default data');
        }
      }
    } catch (error) {
      console.error('Error loading profile ', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // ✅ Save profile data to Firestore
  const handleSave = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setLoading(true);
    try {
      // Create/update user document in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        emergencyContact: profileData.emergencyContact,
        age: profileData.age,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(), // Only set if document doesn't exist
      }, { merge: true }); // Use merge to update existing fields without overwriting

      console.log('✅ Profile data saved to Firestore');
      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile ', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reload original data from Firestore
    loadProfileData();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Profile
      </Text>
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Header */}
        <Card style={styles.profileCard}>
          <Card.Content style={styles.profileContent}>
            <Avatar.Text 
              size={100} 
              label={profileData.name.charAt(0).toUpperCase()} 
              style={styles.avatar}
            />
            <View style={styles.profileInfo}>
              <Text variant="headlineSmall" style={styles.userName}>
                {profileData.name}
              </Text>
              <Text variant="bodyMedium" style={styles.userEmail}>
                {profileData.email}
              </Text>
            </View>
            <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
              <MaterialCommunityIcons 
                name="pencil" 
                size={24} 
                color="#2196F3" 
              />
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {/* Profile Information */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Personal Information
            </Text>
            <Divider style={styles.divider} />
            
            {isEditing ? (
              <View>
                <TextInput
                  label="Full Name"
                  value={profileData.name}
                  onChangeText={(text) => setProfileData({...profileData, name: text})}
                  mode="outlined"
                  style={styles.input}
                />
                <TextInput
                  label="Age"
                  value={profileData.age}
                  onChangeText={(text) => setProfileData({...profileData, age: text})}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.input}
                />
                <TextInput
                  label="Phone Number"
                  value={profileData.phone}
                  onChangeText={(text) => setProfileData({...profileData, phone: text})}
                  mode="outlined"
                  keyboardType="phone-pad"
                  style={styles.input}
                />
                <TextInput
                  label="Emergency Contact"
                  value={profileData.emergencyContact}
                  onChangeText={(text) => setProfileData({...profileData, emergencyContact: text})}
                  mode="outlined"
                  keyboardType="phone-pad"
                  style={styles.input}
                />
                <View style={styles.buttonRow}>
                  <Button 
                    mode="outlined" 
                    onPress={handleCancel}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </Button>
                  <Button 
                    mode="contained" 
                    onPress={handleSave}
                    loading={loading}
                    disabled={loading}
                    style={styles.saveButton}
                  >
                    Save
                  </Button>
                </View>
              </View>
            ) : (
              <View>
                <View style={styles.infoRow}>
                  <Text variant="bodyMedium" style={styles.label}>Age:</Text>
                  <Text variant="bodyMedium">{profileData.age || 'Not specified'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text variant="bodyMedium" style={styles.label}>Phone:</Text>
                  <Text variant="bodyMedium">{profileData.phone || 'Not specified'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text variant="bodyMedium" style={styles.label}>Emergency Contact:</Text>
                  <Text variant="bodyMedium">{profileData.emergencyContact || 'Not specified'}</Text>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Logout Button */}
        <Card style={styles.card}>
          <Card.Content>
            <Button
              mode="outlined"
              onPress={handleLogout}
              style={styles.logoutButton}
              textColor="#F44336"
              icon="logout"
            >
              Logout
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
  title: {
    marginBottom: 20,
    textAlign: 'center',
    color: '#2196F3',
    marginTop: 20,
    paddingHorizontal: 16,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  profileCard: {
    marginBottom: 16,
    backgroundColor: '#E3F2FD',
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatar: {
    backgroundColor: '#2196F3',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    marginBottom: 4,
  },
  userEmail: {
    color: '#666666',
  },
  editButton: {
    padding: 8,
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 8,
    color: '#2196F3',
  },
  divider: {
    marginVertical: 12,
  },
  input: {
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 0.45,
  },
  saveButton: {
    flex: 0.45,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  label: {
    fontWeight: 'bold',
  },
  logoutButton: {
    marginTop: 8,
    borderColor: '#F44336',
  },
});
