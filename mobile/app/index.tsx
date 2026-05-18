import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#16a34a" />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;
  // Onboarding gate (name check) is added in Phase 1 alongside the screen.
  return <Redirect href="/(tabs)" />;
}
