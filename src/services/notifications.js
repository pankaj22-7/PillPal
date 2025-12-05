import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function registerForPush() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('med-reminders', {
      name:'Medication Reminders',
      importance:Notifications.AndroidImportance.HIGH,
      sound:true,
    });
  }
  return token;
}

export async function scheduleReminder(dateISO, title, body) {
  return Notifications.scheduleNotificationAsync({
    content:{ title, body, sound:true, },
    trigger:{ date: new Date(dateISO) },
  });
}
