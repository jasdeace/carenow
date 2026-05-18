import { Platform } from 'react-native';
import { supabase } from './supabase';

// Lazy-load native modules — a missing/old build must never crash the
// app at import time. Only the notification feature degrades.
function getNotifications(): typeof import('expo-notifications') | null {
  try {
    return require('expo-notifications');
  } catch {
    return null;
  }
}
function getDevice(): typeof import('expo-device') | null {
  try {
    return require('expo-device');
  } catch {
    return null;
  }
}
function getProjectId(): string | undefined {
  try {
    const Constants = require('expo-constants').default;
    return Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  } catch {
    return undefined;
  }
}

let handlerSet = false;
function ensureHandler(N: typeof import('expo-notifications')) {
  if (handlerSet) return;
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
  handlerSet = true;
}

async function ensurePermission(N: typeof import('expo-notifications')): Promise<boolean> {
  const Device = getDevice();
  if (Device && !Device.isDevice) return false;
  let status = (await N.getPermissionsAsync()).status;
  if (status !== 'granted') {
    status = (await N.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return false;
  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync('default', {
      name: 'default',
      importance: N.AndroidImportance.MAX,
    });
  }
  return true;
}

export const notificationService = {
  async registerForPush(userId: string) {
    const N = getNotifications();
    if (!N) return;
    try {
      ensureHandler(N);
      if (!(await ensurePermission(N))) return;
      const projectId = getProjectId();
      if (!projectId) {
        console.warn('Push: no EAS projectId; skipping remote token registration');
        return;
      }
      const token = (await N.getExpoPushTokenAsync({ projectId })).data;
      await supabase.from('users').update({ fcm_token: token }).eq('id', userId);
    } catch (e) {
      console.error('Push registration failed:', e);
    }
  },

  async scheduleMedReminders(medId: string, medName: string, times: string[]) {
    const N = getNotifications();
    if (!N) return;
    try {
      if (!(await ensurePermission(N))) return;
      for (const time of times) {
        const [hour, minute] = time.split(':').map(Number);
        if (Number.isNaN(hour) || Number.isNaN(minute)) continue;
        await N.scheduleNotificationAsync({
          identifier: `med-${medId}-${time}`,
          content: { title: '약 복용 시간', body: `${medName} 복용할 시간입니다.` },
          trigger: {
            type: N.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
          },
        });
      }
    } catch (e) {
      console.error('Schedule reminders failed:', e);
    }
  },

  async cancelMedReminders(medId: string) {
    const N = getNotifications();
    if (!N) return;
    try {
      const all = await N.getAllScheduledNotificationsAsync();
      for (const n of all) {
        if (n.identifier?.startsWith(`med-${medId}-`)) {
          await N.cancelScheduledNotificationAsync(n.identifier);
        }
      }
    } catch (e) {
      console.error('Cancel reminders failed:', e);
    }
  },
};
