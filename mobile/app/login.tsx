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
import { useRouter, Link } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { supabase } from '@/lib/supabase';
import { normalizePhone, formatPhone } from '@/lib/phoneUtils';
import { BrandMark } from '@/components/ui/BrandMark';

export default function Login() {
  const { t } = useTranslation();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    const normalized = normalizePhone(phone);
    const fakeEmail = `${normalized}@carelink.app`;
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password,
    });
    setLoading(false);
    if (authError) setError(t('auth.login_failed'));
    else router.replace('/');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-secondary"
    >
      <View className="flex-1 items-center justify-center px-6">
        {/* Brand */}
        <View className="mb-10 items-center">
          <View
            className="mb-4"
            style={{
              shadowColor: '#0F2C2E',
              shadowOpacity: 0.18,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 6,
              borderRadius: 22,
            }}
          >
            <BrandMark size={80} />
          </View>
          <Text className="text-4xl font-extrabold tracking-tight text-primary">Bodacare</Text>
          <Text className="mt-1 text-sm font-medium text-muted-foreground">
            내 건강 동반자
          </Text>
        </View>

        {/* Card */}
        <View className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl">
          <Text className="text-2xl font-bold text-foreground">{t('auth.login_title')}</Text>
          <Text className="mb-5 mt-1 text-sm text-muted-foreground">{t('auth.login_desc')}</Text>

          <Text className="mb-1.5 text-sm font-medium text-foreground">{t('auth.phone')}</Text>
          <TextInput
            value={phone}
            onChangeText={(v) => setPhone(formatPhone(v))}
            placeholder={t('auth.phone_placeholder')}
            placeholderTextColor="#a1a1aa"
            keyboardType="phone-pad"
            className="mb-4 h-14 rounded-xl border border-border px-4 text-center text-lg text-foreground"
          />

          <Text className="mb-1.5 text-sm font-medium text-foreground">{t('auth.password')}</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            className="mb-4 h-14 rounded-xl border border-border px-4 text-center text-lg text-foreground"
          />

          {error && <Text className="mb-3 text-sm text-destructive">{error}</Text>}

          <Pressable
            onPress={handleLogin}
            disabled={loading || !phone || !password}
            className={`h-12 items-center justify-center rounded-xl bg-primary ${
              loading || !phone || !password ? 'opacity-50' : ''
            }`}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-lg font-semibold text-primary-foreground">
                {t('auth.login_btn')}
              </Text>
            )}
          </Pressable>

          <View className="mt-4 flex-row justify-center gap-1">
            <Text className="text-sm text-muted-foreground">{t('auth.no_account')}</Text>
            <Link href="/signup" className="text-sm font-medium text-primary underline">
              {t('auth.signup_link')}
            </Link>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
