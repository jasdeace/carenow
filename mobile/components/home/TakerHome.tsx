import { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';

function greeting(name: string) {
  const h = new Date().getHours();
  const part = h < 12 ? '좋은 아침이에요' : h < 18 ? '안녕하세요' : '좋은 저녁이에요';
  return `${part}, ${name}님`;
}

type Dose = {
  id: string;
  name_ko: string;
  dosage_amount?: string;
  dosage_unit?: string;
  display_time: string;
  is_taken: boolean;
  medication_logs?: any[];
};

const viewerInfo = (v: any) => (Array.isArray(v.users) ? v.users[0] : v.users) || {};

export function TakerHome() {
  const { user, profile } = useAuthStore();
  const [meds, setMeds] = useState<any[]>([]);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [weekly, setWeekly] = useState<any[]>([]);
  const [viewers, setViewers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingSOS, setSendingSOS] = useState(false);
  const [busyViewer, setBusyViewer] = useState<string | null>(null);

  const today = new Date();

  useEffect(() => {
    if (user?.id) load();
  }, [user?.id]);

  const load = async () => {
    if (!user?.id) return;
    try {
      const [m, c, p] = await Promise.all([
        api.getTodayMedications(user.id),
        api.getTodayCheckin(user.id),
        api.getWeeklyAdherence(user.id),
      ]);
      setMeds(m || []);
      setHasCheckedIn(!!c);
      setWeekly(p || []);
      // Who is connected to / watching this user's data
      try {
        const circleId = await api.getLovedOneCircleId(user.id);
        if (circleId) {
          const members = await api.getCareCircleViewers(circleId);
          setViewers((members || []).filter((v: any) => v.user_id !== user.id));
        }
      } catch (e) {
        console.error('viewers load failed:', e);
      }
    } catch (e) {
      console.error('TakerHome load failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const isDoseTaken = (med: any, timeStr: string) => {
    const ds = today.toDateString();
    return (
      med.medication_logs?.some((l: any) => {
        if (l.status !== 'taken') return false;
        if (l.scheduled_at) {
          const so = new Date(l.scheduled_at);
          if (so.toDateString() !== ds) return false;
          return (
            so.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) ===
            timeStr.substring(0, 5)
          );
        }
        return new Date(l.taken_at).toDateString() === ds;
      }) || false
    );
  };

  const doses: Dose[] = meds
    .flatMap((med) => {
      const schedules = med.medication_schedules || [{ time_of_day: '09:00:00' }];
      return schedules.map((s: any) => ({
        ...med,
        display_time: s.time_of_day?.substring(0, 5) || '09:00',
        is_taken: isDoseTaken(med, s.time_of_day || '09:00'),
      }));
    })
    .sort((a, b) => a.display_time.localeCompare(b.display_time));

  const takeMed = async (dose: Dose) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const [h, m] = dose.display_time.split(':');
    const at = new Date(today);
    at.setHours(parseInt(h), parseInt(m), 0, 0);
    try {
      await api.takeMedication(dose.id, at.toISOString(), at.toISOString());
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const undoMed = async (dose: Dose) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ds = today.toDateString();
    const log = dose.medication_logs?.find((l: any) =>
      l.scheduled_at
        ? new Date(l.scheduled_at).toDateString() === ds &&
          new Date(l.scheduled_at).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          }) === dose.display_time
        : new Date(l.taken_at).toDateString() === ds,
    );
    if (!log) return;
    try {
      await api.undoMedication(log.id);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const checkin = async () => {
    if (!user?.id) return;
    setHasCheckedIn(true);
    try {
      await api.submitDailyCheckin(user.id, 5);
    } catch (e) {
      console.error(e);
    }
  };

  const acceptViewer = async (v: any) => {
    setBusyViewer(v.id);
    try {
      await api.acceptCareCircleMember(v.id);
      setViewers((prev) =>
        prev.map((x) => (x.id === v.id ? { ...x, accepted_at: new Date().toISOString() } : x)),
      );
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '');
    } finally {
      setBusyViewer(null);
    }
  };

  const removeViewer = (v: any) => {
    Alert.alert('연결 해제', `${viewerInfo(v).name_ko || '이 사람'}의 접근을 해제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '해제',
        style: 'destructive',
        onPress: async () => {
          setBusyViewer(v.id);
          try {
            await api.removeCareCircleMember(v.id);
            setViewers((prev) => prev.filter((x) => x.id !== v.id));
          } catch (e: any) {
            Alert.alert('오류', e?.message ?? '');
          } finally {
            setBusyViewer(null);
          }
        },
      },
    ]);
  };

  const sos = () => {
    Alert.alert('긴급 도움 요청', '돌봄 가족에게 알림을 보내고 119로 연결합니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '긴급 요청',
        style: 'destructive',
        onPress: async () => {
          setSendingSOS(true);
          try {
            if (user?.id) await api.sendSosAlert(user.id);
          } catch (e) {
            console.error('SOS alert failed:', e);
          }
          setSendingSOS(false);
          Linking.openURL('tel:119');
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

  const takenCount = doses.filter((d) => d.is_taken).length;

  return (
    <View className="gap-4">
      <Text className="text-lg font-bold text-foreground">
        {greeting(profile?.name_ko || 'User')}
      </Text>

      {/* Daily check-in */}
      <Pressable
        onPress={checkin}
        disabled={hasCheckedIn}
        className={`h-12 items-center justify-center rounded-xl ${
          hasCheckedIn ? 'bg-secondary' : 'bg-primary'
        }`}
      >
        <Text
          className={`text-base font-semibold ${
            hasCheckedIn ? 'text-muted-foreground' : 'text-primary-foreground'
          }`}
        >
          {hasCheckedIn ? '괜찮아요 ✓' : '오늘 괜찮아요 😊'}
        </Text>
      </Pressable>

      {/* Medications */}
      <View className="rounded-2xl bg-background p-4 shadow-sm">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-lg font-bold text-foreground">오늘의 약</Text>
          <View className="rounded-full bg-secondary px-3 py-1">
            <Text className="text-sm font-semibold text-foreground">
              {takenCount} / {doses.length}
            </Text>
          </View>
        </View>
        {doses.length === 0 ? (
          <Text className="py-2 text-sm text-muted-foreground">등록된 약이 없습니다.</Text>
        ) : (
          <View className="gap-3">
            {doses.map((dose, idx) => (
              <View
                key={`${dose.id}-${idx}`}
                className={`rounded-xl border p-3 ${
                  dose.is_taken ? 'border-transparent bg-secondary' : 'border-primary/10 bg-primary/5'
                }`}
              >
                <View className="mb-2 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="rounded-md bg-primary/10 px-2 py-0.5">
                      <Text className="text-sm font-bold text-primary">{dose.display_time}</Text>
                    </View>
                    <Text className="text-base font-medium text-foreground">{dose.name_ko}</Text>
                  </View>
                  <Text className="text-sm text-muted-foreground">
                    {dose.dosage_amount}
                    {dose.dosage_unit}
                  </Text>
                </View>
                <Pressable
                  onPress={() => (dose.is_taken ? undoMed(dose) : takeMed(dose))}
                  className={`h-11 items-center justify-center rounded-xl ${
                    dose.is_taken ? 'border border-yellow-500/50 bg-yellow-50' : 'bg-primary'
                  }`}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.85 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  })}
                >
                  <Text
                    className={`text-base font-semibold ${
                      dose.is_taken ? 'text-yellow-600' : 'text-primary-foreground'
                    }`}
                  >
                    {dose.is_taken ? '되돌리기' : '복용했어요 ✓'}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Weekly progress */}
      {weekly.length > 0 && (
        <View className="rounded-2xl bg-background p-4 shadow-sm">
          <Text className="mb-3 text-base font-bold text-foreground">주간 복용률</Text>
          <View className="flex-row justify-between">
            {weekly.map((entry: any, i: number) => {
              const [dayName, dateStr] = entry.day.split(' ');
              const full = entry.rate === 100;
              const partial = entry.rate > 0 && entry.rate < 100;
              return (
                <View key={i} className="items-center gap-1">
                  <Text className="text-xs text-muted-foreground">{dayName}</Text>
                  <View
                    className={`h-9 w-9 items-center justify-center rounded-full border-2 ${
                      full
                        ? 'border-primary bg-primary'
                        : partial
                          ? 'border-yellow-400 bg-yellow-100'
                          : 'border-secondary bg-secondary'
                    }`}
                  >
                    {full ? (
                      <Ionicons name="checkmark" size={16} color="#ffffff" />
                    ) : partial ? (
                      <Text className="text-[10px] font-bold text-yellow-600">{entry.rate}%</Text>
                    ) : (
                      <Text className="text-xs text-muted-foreground">-</Text>
                    )}
                  </View>
                  <Text className="text-[10px] text-muted-foreground">{dateStr}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Who can see my data */}
      <View className="rounded-2xl bg-background p-4 shadow-sm">
        <View className="mb-3 flex-row items-center gap-2">
          <Ionicons name="eye" size={18} color="#16a34a" />
          <Text className="text-lg font-bold text-foreground">내 건강을 보는 사람</Text>
        </View>
        {viewers.length === 0 ? (
          <Text className="py-1 text-sm text-muted-foreground">아직 연결된 사람이 없습니다.</Text>
        ) : (
          <View className="gap-2">
            {viewers.map((v) => {
              const info = viewerInfo(v);
              const pending = !v.accepted_at;
              return (
                <View
                  key={v.id}
                  className={`flex-row items-center justify-between rounded-xl border p-3 ${
                    pending ? 'border-amber-200 bg-amber-50' : 'border-transparent bg-secondary'
                  }`}
                >
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-foreground">
                      {info.name_ko || info.email || '사용자'}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {pending ? '수락 대기 중' : '연결됨'}
                    </Text>
                  </View>
                  {busyViewer === v.id ? (
                    <ActivityIndicator size="small" color="#16a34a" />
                  ) : (
                    <View className="flex-row items-center gap-1">
                      {pending && (
                        <Pressable
                          onPress={() => acceptViewer(v)}
                          className="rounded-lg bg-primary px-3 py-1.5"
                        >
                          <Text className="text-xs font-bold text-primary-foreground">수락</Text>
                        </Pressable>
                      )}
                      <Pressable onPress={() => removeViewer(v)} className="p-1.5">
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* SOS */}
      <Pressable
        onPress={sos}
        disabled={sendingSOS}
        className="mt-2 h-16 flex-row items-center justify-center gap-2 rounded-2xl bg-destructive"
      >
        {sendingSOS ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <>
            <Ionicons name="alert-circle" size={26} color="#ffffff" />
            <Text className="text-xl font-bold text-destructive-foreground">긴급 SOS</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}
