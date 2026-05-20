import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { normalizePhone, formatPhone } from '@/lib/phoneUtils';
import { COLORS } from '@/constants/design';

const VITAL_KEYS = [
  { key: 'vitals_show_bp', label: '혈압' },
  { key: 'vitals_show_glucose', label: '혈당' },
  { key: 'vitals_show_weight', label: '체중' },
] as const;

const inputStyle = {
  height: 46,
  paddingHorizontal: 14,
  backgroundColor: COLORS.cream[100],
  borderRadius: 12,
  fontSize: 15,
  color: COLORS.ink[900],
};

function GroupTitle({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontSize: 11.5,
        fontWeight: '700',
        color: COLORS.ink[500],
        letterSpacing: 0.7,
        textTransform: 'uppercase',
        marginBottom: 8,
        paddingHorizontal: 4,
      }}
    >
      {children}
    </Text>
  );
}

function GroupCard({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: COLORS.paper,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.lineSoft,
        overflow: 'hidden',
        marginBottom: 14,
      }}
    >
      {children}
    </View>
  );
}

function SettingRow({
  icon,
  iconColor,
  label,
  value,
  right,
  onPress,
  showChevron,
  showDivider,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  label: string;
  value?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  showDivider?: boolean;
}) {
  const Inner = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 13,
        borderBottomWidth: showDivider ? 1 : 0,
        borderBottomColor: COLORS.lineSoft,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 9,
          backgroundColor: COLORS.cream[100],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={16} color={iconColor || COLORS.ink[700]} />
      </View>
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.ink[900] }}>
        {label}
      </Text>
      {right}
      {value && (
        <Text style={{ fontSize: 12.5, color: COLORS.ink[500] }}>{value}</Text>
      )}
      {showChevron && <Ionicons name="chevron-forward" size={16} color={COLORS.ink[300]} />}
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{Inner}</Pressable> : Inner;
}

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
      const { error } = await supabase
        .from('users')
        .update({ phone_kr: normalized })
        .eq('id', user.id);
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
        lab_scan: '검사결과 스캔',
        lab_consultation: '검사결과 상담',
        health_report: '건강 리포트 분석',
        health_report_chat: '건강 리포트 Q&A',
        signup_bonus: '가입 보너스',
        admin_topup: '관리자 충전',
      }[r] || r
    );
  };

  const initial = (profile?.name_ko || profile?.email || '?').trim().charAt(0);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: COLORS.cream[50] }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 4,
          paddingBottom: 8,
        }}
      >
        <Text
          style={{
            fontSize: 26,
            fontWeight: '700',
            color: COLORS.ink[900],
            letterSpacing: -0.6,
          }}
        >
          {t('profile.title')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View
          style={{
            backgroundColor: COLORS.paper,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: COLORS.lineSoft,
            paddingHorizontal: 20,
            paddingVertical: 22,
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <View
            style={{
              width: 76,
              height: 76,
              borderRadius: 38,
              backgroundColor: COLORS.teal[700],
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 32 }}>{initial}</Text>
          </View>
          <Text
            style={{
              fontSize: 22,
              fontWeight: '700',
              color: COLORS.ink[900],
              marginBottom: 4,
            }}
          >
            {profile?.name_ko || '사용자'}
          </Text>
          {profile?.email && (
            <Text style={{ fontSize: 12.5, color: COLORS.ink[500] }}>{profile.email}</Text>
          )}
        </View>

        {/* Token balance card */}
        <GroupCard>
          <Pressable
            onPress={toggleHistory}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: COLORS.coral[100],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="sparkles" size={18} color="#A85A45" />
              </View>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.ink[900] }}>
                  AI 토큰
                </Text>
                <Text style={{ fontSize: 11.5, color: COLORS.ink[500], marginTop: 1 }}>
                  식단 분석, 검사 상담에 사용
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: '700',
                  color: '#A85A45',
                  fontVariant: ['tabular-nums'],
                }}
              >
                {profile?.token_balance ?? 0}
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.ink[500] }}>개</Text>
              <Ionicons
                name={showHistory ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={COLORS.ink[300]}
                style={{ marginLeft: 4 }}
              />
            </View>
          </Pressable>
          {showHistory && (
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: COLORS.lineSoft,
                paddingHorizontal: 16,
                paddingTop: 8,
                paddingBottom: 14,
              }}
            >
              {historyLoading ? (
                <ActivityIndicator color="#A85A45" style={{ paddingVertical: 8 }} />
              ) : tokenHistory.length === 0 ? (
                <Text
                  style={{
                    paddingVertical: 8,
                    fontSize: 12,
                    color: COLORS.ink[500],
                    textAlign: 'center',
                  }}
                >
                  아직 사용 내역이 없습니다
                </Text>
              ) : (
                tokenHistory.map((tx) => (
                  <View
                    key={tx.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: COLORS.lineSoft,
                    }}
                  >
                    <Text style={{ fontSize: 12.5, color: COLORS.ink[900] }}>
                      {reasonLabel(tx.reason)}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: tx.amount < 0 ? COLORS.coral[500] : COLORS.teal[700],
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {tx.amount > 0 ? '+' : ''}
                      {tx.amount}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}
        </GroupCard>

        {/* 내 정보 */}
        <GroupTitle>내 정보</GroupTitle>
        <GroupCard>
          <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
            <Text style={{ fontSize: 12, color: COLORS.ink[500], marginBottom: 6, fontWeight: '600' }}>
              {t('profile.phone')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={phone}
                onChangeText={(v) => setPhone(formatPhone(v))}
                keyboardType="phone-pad"
                placeholder="010-1234-5678"
                placeholderTextColor={COLORS.ink[300]}
                style={[inputStyle, { flex: 1 }]}
              />
              <Pressable
                onPress={savePhone}
                disabled={savingPhone || normalizePhone(phone) === profile?.phone_kr}
                style={({ pressed }) => ({
                  height: 46,
                  paddingHorizontal: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  backgroundColor: COLORS.teal[700],
                  opacity:
                    savingPhone || normalizePhone(phone) === profile?.phone_kr
                      ? 0.5
                      : pressed
                        ? 0.92
                        : 1,
                })}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 13.5 }}>
                  {t('profile.save')}
                </Text>
              </Pressable>
            </View>
          </View>
        </GroupCard>

        {/* 언어 */}
        <GroupTitle>{t('profile.language')}</GroupTitle>
        <GroupCard>
          <View style={{ paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', gap: 8 }}>
            {(['ko', 'en'] as const).map((lng) => {
              const active = i18n.language === lng;
              return (
                <Pressable
                  key={lng}
                  onPress={() => i18n.changeLanguage(lng)}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: active ? COLORS.teal[700] : COLORS.lineSoft,
                    backgroundColor: active ? COLORS.teal[100] : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      color: active ? COLORS.teal[800] : COLORS.ink[700],
                      fontWeight: active ? '700' : '500',
                      fontSize: 14,
                    }}
                  >
                    {lng === 'ko' ? '한국어' : 'English'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </GroupCard>

        {/* 건강수치 표시 */}
        <GroupTitle>{t('profile.vitals_settings')}</GroupTitle>
        <GroupCard>
          {VITAL_KEYS.map((v, i) => (
            <View
              key={v.key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderBottomWidth: i < VITAL_KEYS.length - 1 ? 1 : 0,
                borderBottomColor: COLORS.lineSoft,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 9,
                  backgroundColor: COLORS.cream[100],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="pulse" size={14} color={COLORS.rose[500]} />
              </View>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.ink[900] }}>
                {v.label}
              </Text>
              <Switch
                value={vitals[v.key] ?? true}
                onValueChange={(val) => toggleVital(v.key, val)}
                trackColor={{ true: COLORS.teal[700], false: COLORS.ink[300] }}
                thumbColor="#ffffff"
              />
            </View>
          ))}
        </GroupCard>

        {/* 약관 및 정책 */}
        <GroupTitle>약관 및 정책</GroupTitle>
        <GroupCard>
          {(
            [
              { label: '이용약관', path: '/legal/terms' },
              { label: '개인정보처리방침', path: '/legal/privacy' },
              { label: '민감정보 수집 및 이용 동의', path: '/legal/sensitive' },
            ] as const
          ).map((item, i, arr) => (
            <SettingRow
              key={item.path}
              icon="document-text-outline"
              label={item.label}
              onPress={() => router.push(item.path)}
              showChevron
              showDivider={i < arr.length - 1}
            />
          ))}
        </GroupCard>

        {/* Account */}
        <GroupTitle>계정</GroupTitle>
        <GroupCard>
          <Pressable onPress={handleSignOut}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 14,
                paddingVertical: 13,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.lineSoft,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 9,
                  backgroundColor: COLORS.cream[100],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="log-out-outline" size={16} color={COLORS.ink[700]} />
              </View>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.ink[900] }}>
                {t('profile.signout')}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.ink[300]} />
            </View>
          </Pressable>
          <Pressable onPress={handleDelete}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 14,
                paddingVertical: 13,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 9,
                  backgroundColor: COLORS.rose[100],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
              </View>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.danger }}>
                계정 삭제
              </Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.ink[300]} />
            </View>
          </Pressable>
        </GroupCard>

        <Text
          style={{
            marginTop: 14,
            textAlign: 'center',
            fontSize: 11,
            color: COLORS.ink[400],
          }}
        >
          Bodacare
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
