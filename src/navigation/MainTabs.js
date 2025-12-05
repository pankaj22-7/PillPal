import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Import screens
import DashboardScreen from '../screens/home/DashboardScreen';
import MedListScreen from '../screens/meds/MedListScreen';
import AddMedScreen from '../screens/meds/AddMedScreen';
import CalendarScreen from '../screens/adherence/CalendarScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditMedScreen from '../screens/meds/EditMedScreen';
import FreeOCRPrescriptionParserScreen from '../screens/prescriptions/FreeOCRPrescriptionParserScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Create stack for Meds tab to include AddMedScreen
function MedsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MedList" component={MedListScreen} />
      <Stack.Screen name="AddMed" component={AddMedScreen} />
      <Stack.Screen name="EditMed" component={EditMedScreen} />
    </Stack.Navigator>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator 
      screenOptions={{ 
        headerShown: false,
        tabBarActiveTintColor: '#4CAF50', // PillPal green theme
        tabBarInactiveTintColor: 'gray',
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={DashboardScreen}
        options={{ 
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          )
        }}
      />
      <Tab.Screen 
        name="Meds" 
        component={MedsStack}  // Use stack instead of direct component
        options={{ 
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="pill" color={color} size={size} />
          )
        }}
      />
      <Tab.Screen 
        name="Calendar" 
        component={CalendarScreen}
        options={{ 
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar" color={color} size={size} />
          )
        }}
      />
      <Tab.Screen 
        name="FreeAI" 
        component={FreeOCRPrescriptionParserScreen}
        options={{ 
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="robot" color={color} size={size} />
          ),
          tabBarLabel: 'AI Parser'
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ 
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          )
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? 'cog' : 'cog-outline'} 
              color={color} 
              size={26} 
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
