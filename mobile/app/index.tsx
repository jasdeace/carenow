import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/stores/authStore';

function Loader() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator color="#0F766E" />
    </View>
  );
}

export default function Index() {
  const { user, profile, isLoading } = useAuthStore();

  if (isLoading) return <Loader />;
  if (!user) return <Redirect href="/login" />;
  // Session is valid but the profile hasn't arrived yet (fresh login, no cache)
  if (!profile) return <Loader />;
  if (!profile.name_ko) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
