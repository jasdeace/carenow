import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '@/lib/supabase';
import { normalizePhone, formatPhone } from '@/lib/phoneUtils';

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View
      className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${
        checked ? 'border-primary bg-primary' : 'border-border'
      }`}
    >
      {checked && <Ionicons name="checkmark" size={14} color="#ffffff" />}
    </View>
  );
}

export default function Signup() {
  const { t } = useTranslation();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreedTOS, setAgreedTOS] = useState(false);
  const [agreedSensitive, setAgreedSensitive] = useState(false);

  const handleSignup = async () => {
    setError(null);
    if (password !== confirmPassword) return setError(t('auth.password_mismatch'));
    if (password.length < 6) return setError(t('auth.password_too_short'));

    const normalized = normalizePhone(phone);
    if (!normalized || normalized.length < 10) return setError(t('auth.invalid_phone'));
    if (!agreedTOS || !agreedSensitive) return setError('모든 필수 동의 항목에 체크해 주세요.');

    setLoading(true);
    const { error: signupError } = await supabase.auth.signUp({
      email: `${normalized}@carelink.app`,
      password,
      options: { data: { phone_kr: normalized } },
    });
    setLoading(false);

    if (signupError) {
      setError(
        signupError.message.includes('already registered')
          ? t('auth.already_registered')
          : signupError.message,
      );
    } else {
      router.replace('/onboarding');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-secondary">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-8">
          <View className="w-full max-w-sm self-center rounded-2xl bg-card p-6 shadow-lg">
            <Text className="text-2xl font-bold text-foreground">{t('auth.signup_title')}</Text>
            <Text className="mb-5 mt-1 text-sm text-muted-foreground">{t('auth.signup_desc')}</Text>

            <Text className="mb-1.5 text-sm font-medium text-foreground">{t('auth.phone')}</Text>
            <TextInput
              value={phone}
              onChangeText={(v) => setPhone(formatPhone(v))}
              placeholder={t('auth.phone_placeholder')}
              placeholderTextColor="#a1a1aa"
              keyboardType="phone-pad"
              className="mb-4 h-14 rounded-xl border border-border px-4 text-lg text-foreground"
            />

            <Text className="mb-1.5 text-sm font-medium text-foreground">{t('auth.password')}</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder={t('auth.password_placeholder')}
              placeholderTextColor="#a1a1aa"
              className="mb-4 h-14 rounded-xl border border-border px-4 text-lg text-foreground"
            />

            <Text className="mb-1.5 text-sm font-medium text-foreground">
              {t('auth.confirm_password')}
            </Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder={t('auth.confirm_password_placeholder')}
              placeholderTextColor="#a1a1aa"
              className="mb-4 h-14 rounded-xl border border-border px-4 text-lg text-foreground"
            />

            <Pressable
              onPress={() => setAgreedTOS((v) => !v)}
              className="mb-3 flex-row gap-2"
            >
              <Checkbox checked={agreedTOS} />
              <Text className="flex-1 text-sm leading-tight text-muted-foreground">
                <Text className="text-primary">이용약관</Text> 및{' '}
                <Text className="text-primary">개인정보처리방침</Text>에 동의합니다. (필수)
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setAgreedSensitive((v) => !v)}
              className="mb-4 flex-row gap-2"
            >
              <Checkbox checked={agreedSensitive} />
              <Text className="flex-1 text-sm leading-tight text-muted-foreground">
                <Text className="text-primary">민감정보(건강정보) 수집 및 이용</Text>에 동의합니다.
                (필수)
              </Text>
            </Pressable>

            {error && <Text className="mb-3 text-sm text-destructive">{error}</Text>}

            <Pressable
              onPress={handleSignup}
              disabled={loading || !agreedTOS || !agreedSensitive}
              className={`h-12 items-center justify-center rounded-xl bg-primary ${
                loading || !agreedTOS || !agreedSensitive ? 'opacity-50' : ''
              }`}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-lg font-semibold text-primary-foreground">
                  {t('auth.signup_btn')}
                </Text>
              )}
            </Pressable>

            <View className="mt-4 flex-row justify-center gap-1">
              <Text className="text-sm text-muted-foreground">{t('auth.has_account')}</Text>
              <Link href="/login" className="text-sm font-medium text-primary underline">
                {t('auth.login_btn')}
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
