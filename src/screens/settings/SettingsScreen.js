import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { List, Text, Switch, Button, Card, Divider } from 'react-native-paper';
import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';
// ✅ Import your existing medicineNotificationService
import { medicineNotificationService } from '../../services/medicineNotificationService';

export default function SettingsScreen({ navigation }) {
  // ✅ Enhanced state for medicine-specific settings
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  // ✅ Added medicine reminder specific settings
  const [voiceReminders, setVoiceReminders] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [popupReminders, setPopupReminders] = useState(true);
  const [loading, setLoading] = useState(true);

  // ✅ Load existing settings from medicineNotificationService on mount
  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      // Load settings from your medicineNotificationService
      if (medicineNotificationService && medicineNotificationService.userSettings) {
        const settings = medicineNotificationService.userSettings;
        
        setVoiceReminders(settings.voiceEnabled || true);
        setSmsAlerts(settings.smsCaretakersEnabled || true);
        setPopupReminders(settings.popupEnabled || true);
        setSoundEnabled(settings.reminderSound !== 'none');
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle settings changes and save to medicineNotificationService
  const handleSettingChange = async (settingKey, value, stateSetter) => {
    stateSetter(value);
    
    try {
      if (medicineNotificationService) {
        // Map UI settings to service settings
        const serviceSettings = {};
        
        switch (settingKey) {
          case 'voiceReminders':
            serviceSettings.voiceEnabled = value;
            break;
          case 'smsAlerts':
            serviceSettings.smsCaretakersEnabled = value;
            break;
          case 'popupReminders':
            serviceSettings.popupEnabled = value;
            break;
          case 'soundEnabled':
            serviceSettings.reminderSound = value ? 'default' : 'none';
            break;
        }
        
        await medicineNotificationService.saveUserSettings(serviceSettings);
        console.log(`✅ ${settingKey} updated to:`, value);
      }
    } catch (error) {
      console.error('Error saving setting:', error);
      Alert.alert('Error', 'Failed to save setting. Please try again.');
      // Revert the UI state on error
      stateSetter(!value);
    }
  };

  // ✅ Test voice reminder functionality
  const handleTestVoice = async () => {
    try {
      if (medicineNotificationService && medicineNotificationService.testVoiceMessage) {
        await medicineNotificationService.testVoiceMessage();
      } else {
        Alert.alert('Info', 'Voice test feature is not available.');
      }
    } catch (error) {
      console.error('Error testing voice:', error);
      Alert.alert('Error', 'Failed to test voice reminder.');
    }
  };

  // ✅ Clear all notifications
  const handleClearAllReminders = () => {
    Alert.alert(
      'Clear All Reminders',
      'This will cancel all scheduled medicine reminders. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              if (medicineNotificationService && medicineNotificationService.clearAllNotifications) {
                await medicineNotificationService.clearAllNotifications();
                Alert.alert('Success', 'All medicine reminders have been cleared.');
              }
            } catch (error) {
              console.error('Error clearing reminders:', error);
              Alert.alert('Error', 'Failed to clear reminders.');
            }
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Settings
      </Text>
      
      <ScrollView style={styles.content}>
        {/* ✅ Enhanced Medicine Reminder Settings */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Medicine Reminder Settings
            </Text>
            <Divider style={styles.divider} />
            
            <List.Item
              title="Voice Reminders"
              description="Spoken medicine reminder messages"
              left={(props) => <List.Icon {...props} icon="volume-high" />}
              right={() => (
                <Switch
                  value={voiceReminders}
                  onValueChange={(value) => handleSettingChange('voiceReminders', value, setVoiceReminders)}
                  color="#4CAF50"
                />
              )}
              style={styles.listItem}
            />
            
            <List.Item
              title="SMS Alerts to Caretakers"
              description="Send SMS when medication is missed"
              left={(props) => <List.Icon {...props} icon="message-text" />}
              right={() => (
                <Switch
                  value={smsAlerts}
                  onValueChange={(value) => handleSettingChange('smsAlerts', value, setSmsAlerts)}
                  color="#4CAF50"
                />
              )}
              style={styles.listItem}
            />
            
            <List.Item
              title="Popup Reminders"
              description="Show full-screen reminder alerts"
              left={(props) => <List.Icon {...props} icon="bell-ring" />}
              right={() => (
                <Switch
                  value={popupReminders}
                  onValueChange={(value) => handleSettingChange('popupReminders', value, setPopupReminders)}
                  color="#4CAF50"
                />
              )}
              style={styles.listItem}
            />

            {/* ✅ Test Voice Reminder Button */}
            <List.Item
              title="Test Voice Reminder"
              description="Preview how voice reminders sound"
              left={(props) => <List.Icon {...props} icon="play" />}
              onPress={handleTestVoice}
              style={styles.listItem}
            />
          </Card.Content>
        </Card>

        {/* 🧪 Test PillPal Notifications Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              🧪 Test PillPal Notifications (Works in Expo Go)
            </Text>
            <Divider style={styles.divider} />
            
            <Button
              mode="contained"
              onPress={async () => {
                await medicineNotificationService.testLocalNotificationNow();
              }}
              style={[styles.testButton, { marginBottom: 12 }]}
              buttonColor="#4CAF50"
              icon="bell-alert"
            >
              Test Medicine Reminder
            </Button>
            
            <Button
              mode="outlined"
              onPress={async () => {
                await medicineNotificationService.testMedicineReminderFlow();
              }}
              style={[styles.testButton, { marginBottom: 12 }]}
              icon="medication"
            >
              Test Complete PillPal Flow
            </Button>
            
            <Button
              mode="outlined"
              onPress={async () => {
                await medicineNotificationService.testScheduledMedicineReminder();
              }}
              style={[styles.testButton, { marginBottom: 12 }]}
              icon="clock-alert"
            >
              Test Scheduled Reminder (1 min)
            </Button>
            
            <Button
              mode="text"
              onPress={async () => {
                await medicineNotificationService.debugScheduledNotifications();
              }}
              style={styles.testButton}
              icon="bug"
            >
              Debug Scheduled Notifications
            </Button>
          </Card.Content>
        </Card>

        {/* 🧪 Complete SMS Testing Suite */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              📱 SMS Caretaker Alert Testing
            </Text>
            <Divider style={styles.divider} />
            
            <Button
              mode="contained"
              onPress={async () => {
                await medicineNotificationService.testSMSLogic();
              }}
              style={[styles.testButton, { marginBottom: 12 }]}
              buttonColor="#FF5722"
              icon="message-alert"
            >
              Test SMS Alert Logic
            </Button>
            
            <Button
              mode="outlined"
              onPress={async () => {
                await medicineNotificationService.testCompleteMissedDoseWorkflow();
              }}
              style={[styles.testButton, { marginBottom: 12 }]}
              icon="alert-circle"
            >
              Test Complete Missed Dose + SMS
            </Button>
            
            <Button
              mode="outlined"
              onPress={async () => {
                await medicineNotificationService.testMultipleCaretakerSMS();
              }}
              style={[styles.testButton, { marginBottom: 12 }]}
              icon="account-group"
            >
              Test Multiple Caretaker SMS
            </Button>
            
            <Button
              mode="contained"
              onPress={async () => {
                // ⚠️ Update this phone number with YOUR phone number for real testing
                const yourPhoneNumber = '+91 9552147548'; // ← UPDATE THIS
                
                Alert.alert(
                  'Real SMS Test',
                  `This will send a REAL SMS to ${yourPhoneNumber}. Make sure you have Twilio credentials configured. Proceed?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Send Real SMS',
                      onPress: async () => {
                        try {
                          await medicineNotificationService.testRealTwilioSMS(yourPhoneNumber);
                        } catch (error) {
                          Alert.alert('SMS Test Failed', error.message);
                        }
                      }
                    }
                  ]
                );
              }}
              style={[styles.testButton, { marginBottom: 12 }]}
              buttonColor="#8BC34A"
              icon="cellphone-message"
            >
              🚀 SEND REAL TWILIO SMS TEST
            </Button>
            
            <Button
              mode="contained"
              onPress={async () => {
                // ⚠️ Update these with real phone numbers for testing
                const testCaretakers = [
                  { 
                    name: 'Test Caretaker 1', 
                    phone: '+1234567890', // ← YOUR PHONE NUMBER
                    relationship: 'Family' 
                  },
                  // Add more if you have multiple numbers to test
                ];
                
                Alert.alert(
                  'Real SMS Flow Test',
                  'This will send REAL SMS messages to test caretaker phone numbers. Proceed?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Send Real SMS',
                      onPress: async () => {
                        try {
                          await medicineNotificationService.testRealWorldSMSFlow(testCaretakers);
                        } catch (error) {
                          Alert.alert('Real SMS Flow Test Failed', error.message);
                        }
                      }
                    }
                  ]
                );
              }}
              style={[styles.testButton, { marginBottom: 12 }]}
              buttonColor="#FF9800"
              icon="account-heart"
            >
              🌍 Complete Real-World SMS Test
            </Button>
            
            <Button
              mode="outlined"
              onPress={async () => {
                await medicineNotificationService.testEmergencyScenario();
              }}
              style={[styles.testButton, { marginBottom: 12 }]}
              icon="alert-octagon"
            >
              🚨 Test Emergency Scenario
            </Button>
          </Card.Content>
        </Card>

        {/* 🧪 System Validation */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              🔍 System Validation
            </Text>
            <Divider style={styles.divider} />
            
            <Button
              mode="contained"
              onPress={async () => {
                await medicineNotificationService.testCompleteSystemValidation();
              }}
              style={[styles.testButton, { marginBottom: 12 }]}
              buttonColor="#673AB7"
              icon="check-all"
            >
              Complete System Validation
            </Button>
          </Card.Content>
        </Card>

        {/* ✅ Updated General Notification Settings */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              General Notification Settings
            </Text>
            <Divider style={styles.divider} />
            
            <List.Item
              title="Push Notifications"
              description="Receive medication reminders"
              right={() => (
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  color="#2196F3"
                />
              )}
              style={styles.listItem}
            />
            
            <List.Item
              title="Sound Alerts"
              description="Play sound for reminders"
              right={() => (
                <Switch
                  value={soundEnabled}
                  onValueChange={(value) => handleSettingChange('soundEnabled', value, setSoundEnabled)}
                  color="#2196F3"
                />
              )}
              style={styles.listItem}
            />
            
            <List.Item
              title="Vibration"
              description="Vibrate for reminders"
              right={() => (
                <Switch
                  value={vibrationEnabled}
                  onValueChange={setVibrationEnabled}
                  color="#2196F3"
                />
              )}
              style={styles.listItem}
            />
          </Card.Content>
        </Card>

        {/* ✅ Medicine Management Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Medicine Management
            </Text>
            <Divider style={styles.divider} />
            
            <List.Item
              title="View All Medications"
              description="See your current medication list"
              left={(props) => <List.Icon {...props} icon="pill" />}
              onPress={() => navigation.navigate('Medications')}
              style={styles.listItem}
            />
            
            <List.Item
              title="Scan New Prescription"
              description="Add medications using AI scanner"
              left={(props) => <List.Icon {...props} icon="camera" />}
              onPress={() => navigation.navigate('Prescriptions')}
              style={styles.listItem}
            />
            
            <List.Item
              title="Clear All Reminders"
              description="Cancel all scheduled reminders"
              left={(props) => <List.Icon {...props} icon="delete-sweep" />}
              onPress={handleClearAllReminders}
              style={styles.listItem}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Account & Profile
            </Text>
            <Divider style={styles.divider} />
            
            <List.Item
              title="Edit Profile"
              description="Update your personal information"
              left={(props) => <List.Icon {...props} icon="account-edit" />}
              onPress={() => navigation.navigate('Profile')}
              style={styles.listItem}
            />
            
            <List.Item
              title="Emergency Contacts"
              description="Manage your emergency contacts"
              left={(props) => <List.Icon {...props} icon="phone" />}
              onPress={() => console.log('Navigate to emergency contacts')}
              style={styles.listItem}
            />
            
            <List.Item
              title="Medical Information"
              description="Update allergies and medical conditions"
              left={(props) => <List.Icon {...props} icon="medical-bag" />}
              onPress={() => console.log('Navigate to medical info')}
              style={styles.listItem}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Privacy & Security
            </Text>
            <Divider style={styles.divider} />
            
            <List.Item
              title="Privacy Settings"
              description="Control your data privacy"
              left={(props) => <List.Icon {...props} icon="shield-account" />}
              onPress={() => console.log('Navigate to privacy settings')}
              style={styles.listItem}
            />
            
            <List.Item
              title="Data Export"
              description="Export your medication data"
              left={(props) => <List.Icon {...props} icon="download" />}
              onPress={() => console.log('Export data')}
              style={styles.listItem}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Support & Help
            </Text>
            <Divider style={styles.divider} />
            
            <List.Item
              title="Help Center"
              description="Get help and tutorials"
              left={(props) => <List.Icon {...props} icon="help-circle" />}
              onPress={() => console.log('Navigate to help center')}
              style={styles.listItem}
            />
            
            <List.Item
              title="Contact Support"
              description="Get in touch with our support team"
              left={(props) => <List.Icon {...props} icon="email" />}
              onPress={() => console.log('Contact support')}
              style={styles.listItem}
            />
            
            <List.Item
              title="About PillPal"
              description="App version and information"
              left={(props) => <List.Icon {...props} icon="information" />}
              onPress={() => console.log('Show about info')}
              style={styles.listItem}
            />
          </Card.Content>
        </Card>

        {/* ✅ Updated App Information */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              App Information
            </Text>
            <Divider style={styles.divider} />
            
            <List.Item
              title="Version"
              description="PillPal v1.0.0 - AI Medicine Reminder"
              style={styles.listItem}
            />
            
            <List.Item
              title="Privacy Policy"
              description="Read our privacy policy"
              onPress={() => console.log('Show privacy policy')}
              style={styles.listItem}
            />
            
            <List.Item
              title="Terms of Service"
              description="Read our terms of service"
              onPress={() => console.log('Show terms of service')}
              style={styles.listItem}
            />
          </Card.Content>
        </Card>

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
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    marginBottom: 8,
    color: '#4CAF50', // ✅ Changed to match PillPal branding
  },
  divider: {
    marginVertical: 12,
  },
  listItem: {
    paddingVertical: 4,
  },
  testButton: {
    marginVertical: 4,
  },
  logoutButton: {
    marginTop: 8,
    borderColor: '#F44336',
  },
});
