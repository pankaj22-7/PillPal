import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthStack from './AuthStack';
import MainTabs  from './MainTabs';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../services/firebase';

const Root = createNativeStackNavigator();

export default function AppNavigator() {
  const [user, loading] = useAuthState(auth);

  if (loading) return null;   // splash / loader

  return (
    <NavigationContainer>
      <Root.Navigator screenOptions={{ headerShown:false }}>
        {user ? (
          <Root.Screen name="Main" component={MainTabs} />
        ) : (
          <Root.Screen name="Auth" component={AuthStack} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}
