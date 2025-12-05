import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme/theme';

export default function Intro1({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.imageContainer}>
          <Text style={styles.emoji}>💊</Text>
        </View>
        <Text variant="headlineLarge" style={styles.title}>
          PillPal
        </Text>
        <Text variant="titleMedium" style={styles.subtitle}>
          Smart Medication. Safer Living
        </Text>
        <Button 
          mode="contained" 
          onPress={() => navigation.navigate('Intro2')}
          style={styles.button}
        >
          Continue
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  imageContainer: { marginBottom: 40 },
  emoji: { fontSize: 120, textAlign: 'center' },
  title: { marginBottom: 10, color: theme.colors.primary, textAlign: 'center' },
  subtitle: { marginBottom: 40, textAlign: 'center' },
  button: { marginTop: 20, width: '100%' },
});
