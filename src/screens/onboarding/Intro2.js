import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme/theme';

export default function Intro2({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.imageContainer}>
          <Text style={styles.emoji}>📅</Text>
        </View>
        <Text variant="headlineMedium" style={styles.title}>
          Easily track medications
        </Text>
        <Text variant="bodyLarge" style={styles.description}>
          Set reminders, manage schedules, and never miss a dose with our smart notification system.
        </Text>
        <Button 
          mode="contained" 
          onPress={() => navigation.navigate('Intro3')}
          style={styles.button}
        >
          Next
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
