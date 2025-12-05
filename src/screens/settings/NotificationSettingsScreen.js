import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Card, Text, Switch, Button, Slider, 
  List, Divider, Surface, Chip
} from 'react-native-paper';
import { enhancedMedicineNotificationService } from '../../services/medicineNotificationService';

export default function NotificationSettingsScreen({ navigation }) {
  const [settings, setSettings] = useState({
    voiceEnabled: true,
    voiceLanguage: 'en-US',
    voiceRate: 1.0,
    voicePitch: 1.0,
    popupEnabled: true,
    smsCaretakersEnabled: true,
    reminderSound: 'medicine_bell',
    snoozeTime: 5
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const userSettings = enhancedMedicineNotificationService.userSettings;
      setSettings(userSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateSetting = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await enhancedMedicineNotificationService.saveUserSettings({ [key]: value });
  };

  const testVoiceMessage = async () => {
    setLoading(true);
    try {
      await enhancedMedicineNotificationService.testVoiceMessage();
    } catch (error) {
      Alert.alert('Error', 'Failed to play test voice message');
    } finally {
      setLoading(false);
    }
  };

  const languageOptions = [
    { label: 'English (US)', value: 'en-US' },
    { label: 'English (UK)', value: 'en-GB' },
    { label: 'Spanish', value: 'es-ES' },
    { label: 'French', value: 'fr-FR' },
    { label: 'German', value: 'de-DE' },
    { label: 'Italian', value: 'it-IT' },
    { label: 'Portuguese', value: 'pt-BR' },
    { label: 'Hindi', value: 'hi-IN' }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Voice Message Settings */}
        <Surface style={styles.section} elevation={2}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            🔊 Voice Messages
          </Text>
          
          <List.Item
            title="Enable Voice Messages"
            description="Play voice reminders when it's time for medicine"
            right={() => (
              <Switch
                value={settings.voiceEnabled}
                onValueChange={(value) => updateSetting('voiceEnabled', value)}
              />
            )}
          />
          
          {settings.voiceEnabled && (
            <>
              <Divider />
              
              <List.Item
                title="Language"
                description={languageOptions.find(l => l.value === settings.voiceLanguage)?.label}
                onPress={() => {
                  // Show language picker
                  Alert.alert(
                    'Select Language',
                    'Choose your preferred voice language',
                    languageOptions.map(lang => ({
                      text: lang.label,
                      onPress: () => updateSetting('voiceLanguage', lang.value)
                    }))
                  );
                }}
              />
              
              <View style={styles.sliderContainer}>
                <Text variant="bodyMedium">Voice Speed: {settings.voiceRate.toFixed(1)}x</Text>
                <Slider
                  style={styles.slider}
                  value={settings.voiceRate}
                  minimumValue={0.5}
                  maximumValue={2.0}
                  step={0.1}
                  onValueChange={(value) => updateSetting('voiceRate', value)}
                  thumbColor="#4CAF50"
                  minimumTrackTintColor="#4CAF50"
                />
              </View>
              
              <View style={styles.sliderContainer}>
                <Text variant="bodyMedium">Voice Pitch: {settings.voicePitch.toFixed(1)}</Text>
                <Slider
                  style={styles.slider}
                  value={settings.voicePitch}
                  minimumValue={0.5}
                  maximumValue={2.0}
                  step={0.1}
                  onValueChange={(value) => updateSetting('voicePitch', value)}
                  thumbColor="#4CAF50"
                  minimumTrackTintColor="#4CAF50"
                />
              </View>
              
              <Button
                mode="outlined"
                onPress={testVoiceMessage}
                loading={loading}
                style={styles.testButton}
                icon="volume-high"
              >
                Test Voice Message
              </Button>
            </>
          )}
        </Surface>

        {/* Popup Notification Settings */}
        <Surface style={styles.section} elevation={2}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            📱 Popup Notifications
          </Text>
          
          <List.Item
            title="Enable Popup Reminders"
            description="Show full-screen popup when medicine is due"
            right={() => (
              <Switch
                value={settings.popupEnabled}
                onValueChange={(value) => updateSetting('popupEnabled', value)}
              />
            )}
          />
          
          <List.Item
            title="Snooze Duration"
            description={`${settings.snoozeTime} minutes`}
            onPress={() => {
              Alert.alert(
                'Snooze Duration',
                'How long to snooze medicine reminders?',
                [
                  { text: '5 minutes', onPress: () => updateSetting('snoozeTime', 5) },
                  { text: '10 minutes', onPress: () => updateSetting('snoozeTime', 10) },
                  { text: '15 minutes', onPress: () => updateSetting('snoozeTime', 15) },
                  { text: '30 minutes', onPress: () => updateSetting('snoozeTime', 30) }
                ]
              );
            }}
          />
        </Surface>

        {/* Caretaker SMS Settings */}
        <Surface style={styles.section} elevation={2}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            📱 Caretaker SMS Alerts
          </Text>
          
          <List.Item
            title="Send SMS to Caretakers"
            description="Notify caretakers via SMS when medicines are missed or taken"
            right={() => (
              <Switch
                value={settings.smsCaretakersEnabled}
                onValueChange={(value) => updateSetting('smsCaretakersEnabled', value)}
              />
            )}
          />
          
          {settings.smsCaretakersEnabled && (
            <View style={styles.smsInfo}>
              <Chip style={styles.infoChip} textStyle={{ color: '#fff' }}>
                SMS alerts include:
              </Chip>
              <Text variant="bodySmall" style={styles.smsFeature}>
                ✅ Medicine taken on time
              </Text>
              <Text variant="bodySmall" style={styles.smsFeature}>
                ⏰ Medicine taken late
              </Text>
              <Text variant="bodySmall" style={styles.smsFeature}>
                🚨 Medicine missed (urgent)
              </Text>
              <Text variant="bodySmall" style={styles.smsFeature}>
                ⚠️ Medicine skipped
              </Text>
            </View>
          )}
        </Surface>

        {/* Sound Settings */}
        <Surface style={styles.section} elevation={2}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            🔔 Sounds & Vibration
          </Text>
          
          <List.Item
            title="Reminder Sound"
            description={settings.reminderSound.replace('_', ' ')}
            onPress={() => {
              Alert.alert(
                'Reminder Sound',
                'Choose your medicine reminder sound',
                [
                  { text: 'Medicine Bell', onPress: () => updateSetting('reminderSound', 'medicine_bell') },
                  { text: 'Gentle Chime', onPress: () => updateSetting('reminderSound', 'gentle_chime') },
                  { text: 'Urgent Alert', onPress: () => updateSetting('reminderSound', 'urgent_alert') },
                  { text: 'Default', onPress: () => updateSetting('reminderSound', 'default') }
                ]
              );
            }}
          />
        </Surface>

        <View style={styles.footer}>
          <Text variant="bodySmall" style={styles.footerText}>
            These settings help personalize your medicine reminder experience and ensure your caretakers stay informed about your medication adherence.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sliderContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  testButton: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  smsInfo: {
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },
  infoChip: {
    backgroundColor: '#4CAF50',
    marginBottom: 8,
  },
  smsFeature: {
    color: '#2E7D32',
    marginBottom: 4,
    paddingLeft: 8,
  },
  footer: {
    marginTop: 16,
    padding: 16,
  },
  footerText: {
    textAlign: 'center',
    color: '#666',
    lineHeight: 20,
  },
});
