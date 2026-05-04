// src/services/pushService.js
import { Platform } from 'react-native';
import { supabase } from './supabase';

async function upsertPushToken(userId, token) {
  if (!userId || !token) {
    return;
  }

  await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      device_token: token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,device_token' }
  );
}

export async function registerPushTokenIfAvailable() {
  let notifications;
  try {
    // Optional dependency path 1: Expo notifications.
    notifications = require('expo-notifications');
  } catch {
    notifications = null;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { warning: 'No authenticated user for push token registration.' };
  }

  if (notifications) {
    const perms = await notifications.getPermissionsAsync();
    let status = perms.status;
    if (status !== 'granted') {
      const ask = await notifications.requestPermissionsAsync();
      status = ask.status;
    }

    if (status !== 'granted') {
      return { warning: 'Push permission denied by user.' };
    }

    const tokenResp = await notifications.getExpoPushTokenAsync();
    if (tokenResp?.data) {
      await upsertPushToken(user.id, tokenResp.data);
      return { token: tokenResp.data, provider: 'expo' };
    }
  }

  let messaging;
  try {
    // Optional dependency path 2: Firebase messaging token capture.
    messaging = require('@react-native-firebase/messaging').default;
  } catch {
    return {
      warning:
        'No push SDK found. Install expo-notifications (recommended) or @react-native-firebase/messaging.',
    };
  }

  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  if (!enabled) {
    return { warning: 'Push permission denied by user.' };
  }

  const token = await messaging().getToken();
  await upsertPushToken(user.id, token);
  return { token, provider: 'fcm' };
}

export async function showLocalNotificationIfAvailable({ title, body, data }) {
  let notifications;
  try {
    notifications = require('expo-notifications');
  } catch {
    notifications = null;
  }

  if (!notifications) {
    return false;
  }

  try {
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // Keep going if handler was already set or unavailable.
  }

  try {
    await notifications.scheduleNotificationAsync({
      content: {
        title: title || 'ISIFOOT',
        body: body || '',
        data: data || {},
      },
      trigger: null,
    });
    return true;
  } catch {
    return false;
  }
}
