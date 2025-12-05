import React, { useEffect } from 'react';
import { PaperProvider } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import { medicineNotificationService } from './src/services/medicineNotificationService';

export default function App() {
  useEffect(() => {
    // Initialize medicine notification service
    const initializeServices = async () => {
      try {
        const initialized = await medicineNotificationService.initialize();
        if (initialized) {
          console.log('✅ Medicine notification service ready with SMS support');
        } else {
          console.warn('⚠️ Notification service initialization failed - check permissions');
        }
      } catch (error) {
        console.error('❌ Failed to initialize services:', error);
      }
    };
    
    initializeServices();
  }, []);

  return (
    <PaperProvider>
      <AppNavigator />
    </PaperProvider>
  );
}

export { medicineNotificationService };
