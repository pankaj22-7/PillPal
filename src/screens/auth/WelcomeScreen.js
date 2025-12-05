import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, elderlyStyles } from '../../constants/theme';

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="headlineLarge" style={styles.title}>
            PillPal
          </Text>
          <Text variant="titleMedium" style={styles.subtitle}>
            Smart Medication. Safer Living
          </Text>
        </View>

        <View style={styles.features}>
          <Card style={styles.featureCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.featureTitle}>
                📱 Easy Tracking
              </Text>
              <Text variant="bodyLarge">
                Easily track medications with simple, large buttons
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.featureCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.featureTitle}>
                ⚠️ Safety Alerts
              </Text>
              <Text variant="bodyLarge">
                Get safety alerts for drug interactions
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.featureCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.featureTitle}>
                👥 Family Sharing
              </Text>
              <Text variant="bodyLarge">
                Share progress with family and caregivers
              </Text>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.buttons}>
          <Button 
            mode="contained" 
            style={[styles.button, elderlyStyles.button]}
            labelStyle={elderlyStyles.text}
            onPress={() => navigation.navigate('Onboarding')}
          >
            Get Started
          </Button>
          
          <Button 
            mode="outlined" 
            style={[styles.button, elderlyStyles.button]}
            labelStyle={elderlyStyles.text}
            onPress={() => navigation.navigate('Login')}
          >
            I have an account
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    color: theme.colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    color: theme.colors.onBackground,
    textAlign: 'center',
  },
  features: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 20,
  },
  featureCard: {
    marginVertical: 8,
    elevation: 2,
  },
  featureTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  buttons: {
    marginBottom: 20,
  },
  button: {
    marginVertical: 8,
  },
});
