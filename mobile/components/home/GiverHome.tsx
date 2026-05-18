import { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { formatPhone } from '@/lib/phoneUtils';

export function GiverHome() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [takers, setTakers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) load();
  }, [user?.id]);

  const load = async () => {
    if (!user?.id) return;
    try {
      setTakers(await api.getGiverTakersList(user.id));
    } catch (e) {
      console.error('GiverHome load failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const join = async () => {
    if (!user?.id || !code) return;
    setJoining(true);
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code);
      if (isUUID) await api.joinCareCircle(user.id, code);
      else await api.joinCareCircleByPhone(user.id, code.replace(/\D/g, ''));
      setCode('');
      await load();
    } catch (e: any) {
      Alert.alert('연결 실패', e.message ?? '다시 시도해주세요');
    } finally {
      setJoining(false);
    }
  };

  const disconnect = (taker: any) => {
    Alert.alert('연결 해제', `${taker.display_name_ko || '사용자'}님과의 연결을 해제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '해제',
        style: 'destructive',
        onPress: async () => {
          if (!user?.id) return;
          setBusyId(taker.id);
          try {
            const circleId = taker.circle_id || (await api.getTakerCircleId(taker.id));
            if (circleId) {
              await api.leaveCareCircle(user.id, circleId);
              setTakers((prev) => prev.filter((t) => t.id !== taker.id));
            }
          } catch (e: any) {
            Alert.alert('오류', e.message ?? '연결 해제에 실패했습니다');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="items-center py-16">
        <ActivityIndicator color="#16a34a" />
      </View>
    );
  }

  return (
    <View className="gap-4">
      <Text className="text-lg font-bold text-foreground">돌보는 사람들</Text>

      {takers.length === 0 ? (
        <View className="items-center rounded-2xl border border-dashed border-border bg-background py-10">
          <Ionicons name="heart-outline" size={40} color="#d4d4d8" />
          <Text className="mt-2 text-sm text-muted-foreground">아직 연결된 사람이 없습니다</Text>
        </View>
      ) : (
        <View className="gap-3">
          {takers.map((taker) => (
            <Pressable
              key={taker.id}
              onPress={() =>
                taker.accepted_at &&
                router.push({ pathname: '/giver/[takerId]', params: { takerId: taker.id } })
              }
              className="flex-row items-center justify-between rounded-2xl bg-background p-4 shadow-sm"
            >
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                  <Text className="text-base font-bold text-primary">
                    {taker.display_name_ko?.charAt(0) || '?'}
                  </Text>
                </View>
                <View>
                  <Text className="text-base font-semibold text-foreground">
                    {taker.display_name_ko || '사용자'}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {taker.accepted_at ? '연결됨' : '수락 대기 중'}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => disconnect(taker)}
                disabled={busyId === taker.id}
                className="h-9 w-9 items-center justify-center rounded-full"
              >
                {busyId === taker.id ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                )}
              </Pressable>
            </Pressable>
          ))}
        </View>
      )}

      {/* Connect a new person */}
      <View className="rounded-2xl bg-background p-4 shadow-sm">
        <View className="mb-1 flex-row items-center gap-2">
          <Ionicons name="person-add" size={18} color="#16a34a" />
          <Text className="text-base font-bold text-foreground">새 연결</Text>
        </View>
        <Text className="mb-3 text-sm text-muted-foreground">
          가족의 전화번호를 입력해 건강 정보를 확인하세요.
        </Text>
        <TextInput
          value={code}
          onChangeText={(v) => setCode(formatPhone(v))}
          placeholder="010-XXXX-XXXX"
          placeholderTextColor="#a1a1aa"
          keyboardType="phone-pad"
          className="mb-3 h-12 rounded-xl border border-border px-4 text-lg text-foreground"
        />
        <Pressable
          onPress={join}
          disabled={joining || !code}
          className={`h-12 items-center justify-center rounded-xl bg-primary ${
            joining || !code ? 'opacity-50' : ''
          }`}
        >
          {joining ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-base font-semibold text-primary-foreground">연결하기</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
