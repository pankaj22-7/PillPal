import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme/theme';

export default function Intro3({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.imageContainer}>
          <Text style={styles.emoji}>⚠️</Text>
        </View>
        <Text variant="headlineMedium" style={styles.title}>
          Get safety alerts for drug interactions
        </Text>
        <Text variant="bodyLarge" style={styles.description}>
          Our AI-powered system checks for dangerous drug interactions and allergies to keep you safe.
        </Text>
        <Button 
          mode="contained" 
          onPress={() => navigation.navigate('Login')}
          style={styles.button}
        >
          Get Started
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  imageContainer: { marginBottom: 40 },
  emoji: { fontSize: 100, textAlign: 'center' },
  title: { marginBottom: 20, color: theme.colors.primary, textAlign: 'center' },
  description: { marginBottom: 40, textAlign: 'center', lineHeight: 24 },
  button: { marginTop: 20, width: '100%' },
});
