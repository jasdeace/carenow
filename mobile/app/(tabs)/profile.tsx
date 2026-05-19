import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Switch, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { normalizePhone, formatPhone } from '@/lib/phoneUtils';

const VITAL_KEYS = [
  { key: 'vitals_show_bp', label: '혈압' },
  { key: 'vitals_show_glucose', label: '혈당' },
  { key: 'vitals_show_weight', label: '체중' },
] as const;

export default function Profile() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, profile, fetchProfile, signOut } = useAuthStore();

  const [phone, setPhone] = useState(formatPhone(profile?.phone_kr || ''));
  const [savingPhone, setSavingPhone] = useState(false);
  const [vitals, setVitals] = useState<Record<string, boolean>>({});
  const [tokenHistory, setTokenHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (profile?.phone_kr) setPhone(formatPhone(profile.phone_kr));
  }, [profile?.phone_kr]);

  useEffect(() => {
    (async () => {
      const entries = await AsyncStorage.multiGet(VITAL_KEYS.map((v) => v.key));
      const state: Record<string, boolean> = {};
      for (const [k, v] of entries) state[k] = v !== 'false';
      setVitals(state);
    })();
  }, []);

  const toggleVital = (key: string, value: boolean) => {
    setVitals((prev) => ({ ...prev, [key]: value }));
    AsyncStorage.setItem(key, value.toString());
  };

  const savePhone = async () => {
    if (!user?.id) return;
    setSavingPhone(true);
    try {
      const normalized = normalizePhone(phone);
      const { error } = await supabase.from('users').update({ phone_kr: normalized }).eq('id', user.id);
      if (error) throw error;
      await fetchProfile(user.id);
      Alert.alert('저장됨', t('profile.phone_saved'));
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setSavingPhone(false);
    }
  };

  const toggleHistory = async () => {
    if (!showHistory && tokenHistory.length === 0) {
      setHistoryLoading(true);
      try {
        setTokenHistory(await api.getTokenHistory(user?.id || ''));
      } catch (e) {
        console.error(e);
      } finally {
        setHistoryLoading(false);
      }
    }
    setShowHistory((v) => !v);
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const handleDelete = () => {
    Alert.alert(
      '계정 삭제',
      '모든 건강 데이터와 설정이 영구적으로 삭제되며 복구할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            try {
              await api.deleteAccount(user.id);
              await signOut();
              router.replace('/login');
            } catch {
              Alert.alert('오류', '계정 삭제 중 오류가 발생했습니다.');
            }
          },
        },
      ],
    );
  };

  const reasonLabel = (r: string) => {
    if (r?.startsWith('iap:')) return '토큰 구매';
    return (
      {
        nutrition_chat: 'AI 영양사 채팅',
        meal_analysis: '식단 사진 분석',
        lab_consultation: '검사결과 상담',
        signup_bonus: '가입 보너스',
        admin_topup: '관리자 충전',
      }[r] || r
    );
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-secondary">
      <ScrollView contentContainerClassName="p-4 gap-4">
        <Text className="text-2xl font-bold text-foreground">{t('profile.title')}</Text>

        {/* Token balance */}
        <View className="overflow-hidden rounded-2xl bg-background">
          <Pressable onPress={toggleHistory} className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-violet-100">
                <Ionicons name="sparkles" size={18} color="#8b5cf6" />
              </View>
              <View>
                <Text className="text-sm font-medium text-foreground">AI 토큰</Text>
                <Text className="text-xs text-muted-foreground">식단 분석, 검사 상담에 사용</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-1">
              <Text className="text-2xl font-bold text-violet-600">
                {profile?.token_balance ?? 0}
              </Text>
              <Text className="text-sm text-muted-foreground">개</Text>
              <Ionicons
                name={showHistory ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#a1a1aa"
              />
            </View>
          </Pressable>
          {showHistory && (
            <View className="border-t border-border px-4 pb-4 pt-2">
              {historyLoading ? (
                <ActivityIndicator color="#8b5cf6" className="py-3" />
              ) : tokenHistory.length === 0 ? (
                <Text className="py-3 text-center text-xs text-muted-foreground">
                  아직 사용 내역이 없습니다
                </Text>
              ) : (
                tokenHistory.map((tx) => (
                  <View
                    key={tx.id}
                    className="flex-row items-center justify-between border-b border-border/50 py-2"
                  >
                    <Text className="text-xs text-foreground">{reasonLabel(tx.reason)}</Text>
                    <Text
                      className={`text-sm font-bold ${
                        tx.amount < 0 ? 'text-orange-500' : 'text-emerald-500'
                      }`}
                    >
                      {tx.amount > 0 ? '+' : ''}
                      {tx.amount}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        {/* My info */}
        <View className="rounded-2xl bg-background p-4">
          <View className="mb-3 flex-row items-center gap-2">
            <Ionicons name="person" size={18} color="#16a34a" />
            <Text className="text-lg font-bold text-foreground">{t('profile.my_info')}</Text>
          </View>
          <Text className="text-sm text-muted-foreground">{t('profile.name')}</Text>
          <Text className="mb-3 text-base text-foreground">{profile?.name_ko || '-'}</Text>
          <Text className="mb-1 text-sm text-muted-foreground">{t('profile.phone')}</Text>
          <View className="flex-row gap-2">
            <TextInput
              value={phone}
              onChangeText={(v) => setPhone(formatPhone(v))}
              keyboardType="phone-pad"
              placeholder="010-1234-5678"
              placeholderTextColor="#a1a1aa"
              className="h-12 flex-1 rounded-xl border border-border px-3 text-base text-foreground"
            />
            <Pressable
              onPress={savePhone}
              disabled={savingPhone || normalizePhone(phone) === profile?.phone_kr}
              className={`h-12 items-center justify-center rounded-xl bg-primary px-5 ${
                savingPhone || normalizePhone(phone) === profile?.phone_kr ? 'opacity-50' : ''
              }`}
            >
              <Text className="font-semibold text-primary-foreground">{t('profile.save')}</Text>
            </Pressable>
          </View>
        </View>

        {/* Language */}
        <View className="rounded-2xl bg-background p-4">
          <View className="mb-3 flex-row items-center gap-2">
            <Ionicons name="globe" size={18} color="#16a34a" />
            <Text className="text-lg font-bold text-foreground">{t('profile.language')}</Text>
          </View>
          <View className="flex-row gap-2">
            {(['ko', 'en'] as const).map((lng) => (
              <Pressable
                key={lng}
                onPress={() => i18n.changeLanguage(lng)}
                className={`flex-1 items-center rounded-xl border py-2.5 ${
                  i18n.language === lng ? 'border-primary bg-primary/10' : 'border-border'
                }`}
              >
                <Text className={i18n.language === lng ? 'font-bold text-primary' : 'text-foreground'}>
                  {lng === 'ko' ? '한국어' : 'English'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Vitals settings */}
        <View className="rounded-2xl bg-background p-4">
          <View className="mb-3 flex-row items-center gap-2">
            <Ionicons name="pulse" size={18} color="#ef4444" />
            <Text className="text-lg font-bold text-foreground">{t('profile.vitals_settings')}</Text>
          </View>
          {VITAL_KEYS.map((v) => (
            <View key={v.key} className="flex-row items-center justify-between py-1.5">
              <Text className="text-base text-foreground">{v.label}</Text>
              <Switch
                value={vitals[v.key] ?? true}
                onValueChange={(val) => toggleVital(v.key, val)}
                trackColor={{ true: '#16a34a' }}
              />
            </View>
          ))}
        </View>

        {/* Legal */}
        <View className="overflow-hidden rounded-2xl bg-background">
          {(
            [
              { label: '이용약관', path: '/legal/terms' },
              { label: '개인정보처리방침', path: '/legal/privacy' },
              { label: '민감정보 수집 및 이용 동의', path: '/legal/sensitive' },
            ] as const
          ).map((item, i) => (
            <Pressable
              key={item.path}
              onPress={() => router.push(item.path)}
              className={`flex-row items-center justify-between p-4 ${
                i > 0 ? 'border-t border-border' : ''
              }`}
            >
              <Text className="text-base text-foreground">{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color="#a1a1aa" />
            </Pressable>
          ))}
        </View>

        {/* Sign out / delete */}
        <Pressable
          onPress={handleSignOut}
          className="h-12 flex-row items-center justify-center gap-2 rounded-xl bg-background"
        >
          <Ionicons name="log-out-outline" size={20} color="#71717a" />
          <Text className="text-base font-medium text-muted-foreground">{t('profile.signout')}</Text>
        </Pressable>
        <Pressable
          onPress={handleDelete}
          className="h-12 flex-row items-center justify-center gap-2 rounded-xl"
        >
          <Ionicons name="warning-outline" size={20} color="#ef4444" />
          <Text className="text-base font-medium text-destructive">계정 삭제</Text>
        </Pressable>

        <Text className="mt-1 text-center text-xs text-muted-foreground">
          CareNow · React Native · Phase 1
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
