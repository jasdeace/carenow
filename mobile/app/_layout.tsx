import '../global.css';
import '../i18n/i18n';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { notificationService } from '@/lib/notifications';

// Hold the splash until auth state is resolved.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const { setUser, setProfile, fetchProfile, hydrateCachedProfile } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    (async () => {
      // Warm-start: show the cached profile instantly
      await hydrateCachedProfile();

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;

      setUser(session?.user ?? null);
      useAuthStore.setState({ isLoading: false });
      if (session?.user) {
        fetchProfile(session.user.id);
        notificationService.registerForPush(session.user.id);
      }

      SplashScreen.hideAsync();
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        notificationService.registerForPush(session.user.id);
      } else setProfile(null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar style="dark" />
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
