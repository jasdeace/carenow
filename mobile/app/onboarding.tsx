import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export default function Onboarding() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, fetchProfile } = useAuthStore();

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!user || !name.trim()) return;
    setLoading(true);
    setError(null);

    const phoneFromAuth = (user.user_metadata?.phone_kr as string) || '';

    const { error: updateError } = await supabase
      .from('users')
      .update({ name_ko: name, phone_kr: phoneFromAuth })
      .eq('id', user.id);

    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    try {
      // Every user gets their own care circle for meds, vitals and labs
      await api.createCareCircleForLovedOne(user.id, name);
      await fetchProfile(user.id);
      router.replace('/');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-secondary">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center px-6"
      >
        <View className="w-full max-w-sm self-center rounded-2xl bg-card p-6 shadow-lg">
          <Text className="text-2xl font-bold text-foreground">{t('auth.onboarding_title')}</Text>
          <Text className="mb-5 mt-1 text-sm text-muted-foreground">
            {t('auth.onboarding_desc')}
          </Text>

          <Text className="mb-1.5 text-sm font-medium text-foreground">{t('auth.name')}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('auth.name_placeholder')}
            placeholderTextColor="#a1a1aa"
            className="mb-4 h-14 rounded-xl border border-border px-4 text-lg text-foreground"
          />

          {error && <Text className="mb-3 text-sm text-destructive">{error}</Text>}

          <Pressable
            onPress={handleSubmit}
            disabled={loading || !name.trim()}
            className={`h-12 items-center justify-center rounded-xl bg-primary ${
              loading || !name.trim() ? 'opacity-50' : ''
            }`}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-lg font-semibold text-primary-foreground">
                {t('common.save')}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
