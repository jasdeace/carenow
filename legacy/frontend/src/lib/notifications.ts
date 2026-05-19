import { PushNotifications } from '@capacitor/push-notifications';
import { FCM } from '@capacitor-community/fcm';
import { supabase } from './supabase';

export const notificationService = {
  /**
   * Request push notification permissions and register token
   */
  async requestPermissionsAndRegister(userId: string) {
    console.log('Push: Starting registration for user:', userId);
    try {
      let permStatus = await PushNotifications.checkPermissions();
      console.log('Push: Current permission status:', permStatus);

      if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
        console.log('Push: Requesting permissions...');
        permStatus = await PushNotifications.requestPermissions();
        console.log('Push: New permission status:', permStatus);
      }

      if (permStatus.receive !== 'granted') {
        console.warn('Push: Permission NOT granted:', permStatus.receive);
        // On simulator, this often happens.
        return false;
      }

      console.log('Push: Permissions granted. Setting up listeners...');

      // Add listeners for registration
      await PushNotifications.addListener('registration', async (apnsToken) => {
        console.log('Push: APNs Registration success, getting FCM token...', apnsToken.value);
        try {
          const fcmResponse = await FCM.getToken();
          const fcmToken = fcmResponse.token;
          console.log('Push: Successfully retrieved FCM token:', fcmToken);
          // Save the correct Google FCM token to Supabase
          await this.saveTokenToBackend(userId, fcmToken);
        } catch (fcmError) {
          console.error('Push: Failed to get FCM token:', fcmError);
        }
      });

      await PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Push: Error on registration:', JSON.stringify(error));
      });

      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push: Notification received:', JSON.stringify(notification));
      });

      // Register with Apple / Google to receive push via APNS/FCM
      console.log('Push: Calling register()...');
      await PushNotifications.register();
      return true;

    } catch (e) {
      console.error('Push: Failed to register (Are you on web or simulator?):', e);
      return false;
    }
  },

  async saveTokenToBackend(userId: string, token: string) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ fcm_token: token })
        .eq('id', userId);
        
      if (error) {
        console.error('Error saving FCM token to users table:', error);
      } else {
        console.log('Successfully saved FCM token for user:', userId);
      }
    } catch (e) {
      console.error('Error in saveTokenToBackend:', e);
    }
  },

  // Legacy functions modified to do nothing since backend handles it now.
  // Keeping them here temporarily to avoid breaking other components immediately,
  // but they should be removed from TakerHome and Medications.
  async scheduleMedicationReminder(...args: any[]) {
    console.log('Medication reminders are now handled by the backend push notifications.', args);
  },

  async cancelMissedReminder(...args: any[]) {
    // Handled by backend
    console.log('Backend handles this.', args);
  },
  
  async cancelAllReminders(...args: any[]) {
    // Handled by backend
    console.log('Backend handles this.', args);
  }
};
