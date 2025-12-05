import React, { useState } from 'react';
import { StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput, Button, Card, Chip } from 'react-native-paper';
import { collection, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { theme } from '../../theme/theme';

export default function ProfileSetup({ navigation }) {
  const [form, setForm] = useState({
    name: '',
    age: '',
    emergencyContact: '',
    allergies: [],
  });
  const [newAllergy, setNewAllergy] = useState('');
  const [loading, setLoading] = useState(false);

  const commonAllergies = ['Peanuts', 'Shellfish', 'Latex', 'Penicillin', 'Aspirin'];

  const addAllergy = (allergy) => {
    if (!form.allergies.includes(allergy)) {
      setForm({ ...form, allergies: [...form.allergies, allergy] });
    }
    setNewAllergy('');
  };

  const removeAllergy = (allergy) => {
    setForm({ 
      ...form, 
      allergies: form.allergies.filter(a => a !== allergy) 
    });
  };

  const handleSave = async () => {
    if (!form.name || !form.age) {
      Alert.alert('Missing Information', 'Please fill in your name and age.');
      return;
    }

    setLoading(true);
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        ...form,
        email: auth.currentUser.email,
        createdAt: new Date(),
      });
      // Navigation will happen automatically due to auth state
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineMedium" style={styles.title}>
              Profile Setup
            </Text>

            <TextInput
              label="Name"
              value={form.name}
              onChangeText={(name) => setForm({ ...form, name })}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Age"
              value={form.age}
              onChangeText={(age) => setForm({ ...form, age })}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
            />

            <TextInput
              label="Emergency Contact"
              value={form.emergencyContact}
              onChangeText={(emergencyContact) => setForm({ ...form, emergencyContact })}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.input}
            />

            <Text variant="titleMedium" style={styles.sectionTitle}>
              Allergies
            </Text>

            <TextInput
              label="Add Allergy"
              value={newAllergy}
              onChangeText={setNewAllergy}
              mode="outlined"
              onSubmitEditing={() => addAllergy(newAllergy)}
              style={styles.input}
            />

            <Text variant="bodyMedium" style={styles.label}>
              Common Allergies:
            </Text>
            <View style={styles.chipContainer}>
              {commonAllergies.map((allergy) => (
                <Chip
                  key={allergy}
                  onPress={() => addAllergy(allergy)}
                  style={styles.chip}
                >
                  {allergy}
                </Chip>
              ))}
            </View>

            {form.allergies.length > 0 && (
              <>
                <Text variant="bodyMedium" style={styles.label}>
                  Your Allergies:
                </Text>
                <View style={styles.chipContainer}>
                  {form.allergies.map((allergy) => (
                    <Chip
                      key={allergy}
                      onClose={() => removeAllergy(allergy)}
                      style={styles.selectedChip}
                    >
                      {allergy}
                    </Chip>
                  ))}
                </View>
              </>
            )}

            <Button
              mode="contained"
              onPress={handleSave}
              loading={loading}
              disabled={loading}
              style={styles.button}
            >
              Save & Continue
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 20 },
  card: { marginBottom: 20 },
  title: { marginBottom: 20, textAlign: 'center', color: theme.colors.primary },
  input: { marginBottom: 16 },
  sectionTitle: { marginTop: 20, marginBottom: 10 },
  label: { marginTop: 10, marginBottom: 8 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  chip: { margin: 4 },
  selectedChip: { margin: 4, backgroundColor: theme.colors.primaryContainer },
  button: { marginTop: 20 },
});
