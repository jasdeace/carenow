import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Show notifications while the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function ensurePermission(): Promise<boolean> {
  if (!Device.isDevice) return false;
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }
  return true;
}

export const notificationService = {
  // Register for remote push and store the token on the user row.
  async registerForPush(userId: string) {
    try {
      if (!(await ensurePermission())) return;
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;
      if (!projectId) {
        // No EAS project linked yet — remote push token unavailable.
        console.warn('Push: no EAS projectId; skipping remote token registration');
        return;
      }
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      await supabase.from('users').update({ fcm_token: token }).eq('id', userId);
    } catch (e) {
      console.error('Push registration failed:', e);
    }
  },

  // Schedule daily local reminders for a medication's dose times.
  async scheduleMedReminders(medId: string, medName: string, times: string[]) {
    if (!(await ensurePermission())) return;
    for (const time of times) {
      const [hour, minute] = time.split(':').map(Number);
      if (Number.isNaN(hour) || Number.isNaN(minute)) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `med-${medId}-${time}`,
        content: { title: '약 복용 시간', body: `${medName} 복용할 시간입니다.` },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
    }
  },

  async cancelMedReminders(medId: string) {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of all) {
      if (n.identifier?.startsWith(`med-${medId}-`)) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  },
};
