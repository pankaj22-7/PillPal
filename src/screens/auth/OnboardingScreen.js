import React from 'react';
import { View } from 'react-native';
import { Text, Button } from 'react-native-paper';

export default function OnboardingScreen({ navigation }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text variant="headlineMedium">Welcome to PillPal</Text>
      <Text variant="bodyLarge">Smart medication management</Text>
      <Button 
        mode="contained" 
        onPress={() => navigation.navigate('SignUp')}
        style={{ marginTop: 20 }}
      >
        Get Started
      </Button>
    </View>
  );
}
