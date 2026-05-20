import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { COLORS } from '@/constants/design';

type Activity = { id: string; time: Date; desc: string };

type Tab = 'overview' | 'health' | 'circle';

export default function GiverDashboard() {
  const router = useRouter();
  const { takerId } = useLocalSearchParams<{ takerId: string }>();
  const { user, profile } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // add-med form
  const [medName, setMedName] = useState('');
  const [medAmt, setMedAmt] = useState('');
  const [medUnit, setMedUnit] = useState('mg');
  const [medTimes, setMedTimes] = useState<string[]>(['09:00']);

  // edit modal
  const [editing, setEditing] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editAmt, setEditAmt] = useState('');
  const [editUnit, setEditUnit] = useState('mg');
  const [editTimes, setEditTimes] = useState<string[]>(['09:00']);

  useEffect(() => {
    if (takerId) load();
  }, [takerId]);

  const weekDays = useMemo((): { date: Date; ds: string; day: string; rate: number }[] => {
    if (!data?.adherence) return [];
    return data.adherence.map((entry: any, i: number) => {
      const d = new Date();
      d.setDate(d.getDate() - (data.adherence.length - 1 - i));
      return { date: d, ds: d.toDateString(), day: entry.day, rate: entry.rate };
    });
  }, [data?.adherence]);

  const todayDs = new Date().toDateString();
  const activeDayDs = selectedDay || todayDs;
  const dayActivities: Activity[] = data?.activitiesByDay?.[activeDayDs] ?? [];

  const load = async () => {
    if (!user?.id || !takerId) return;
    setLoading(true);
    try {
      const takers = await api.getGiverTakersList(user.id);
      const taker = takers.find((tk: any) => tk.id === takerId);
      if (!taker?.accepted_at) {
        setAccepted(false);
        return;
      }
      setAccepted(true);
      const takerUserId = taker.user_id;
      const [checkin, bp, meds, adherence] = await Promise.all([
        api.getTodayCheckin(takerUserId),
        api.getVitalsBP(takerUserId),
        api.getTodayMedications(takerUserId),
        api.getWeeklyAdherence(takerUserId),
      ]);
      const today = new Date().toDateString();
      const taken =
        meds?.filter((m: any) =>
          m.medication_logs?.some(
            (l: any) => l.status === 'taken' && new Date(l.taken_at).toDateString() === today,
          ),
        ).length || 0;

      const activitiesByDay: Record<string, Activity[]> = {};
      const push = (a: Activity) => {
        const ds = a.time.toDateString();
        (activitiesByDay[ds] ||= []).push(a);
      };
      if (checkin)
        push({ id: 'chk', time: new Date(checkin.checked_in_at), desc: '체크인 완료' });
      bp?.forEach((b: any) =>
        push({
          id: `bp-${b.id}`,
          time: new Date(b.measured_at || b.created_at),
          desc: `혈압 ${b.systolic}/${b.diastolic}`,
        }),
      );
      meds?.forEach((m: any) =>
        m.medication_logs?.forEach((l: any) => {
          if (l.status === 'taken')
            push({ id: `med-${l.id}`, time: new Date(l.taken_at), desc: `${m.name_ko} 복용` });
        }),
      );
      Object.values(activitiesByDay).forEach((arr) =>
        arr.sort((a, b) => b.time.getTime() - a.time.getTime()),
      );

      setData({
        checkinDone: !!checkin,
        medsTaken: taken,
        medsTotal: meds?.length || 0,
        lastBP: bp?.[0] ? `${bp[0].systolic}/${bp[0].diastolic}` : '--/--',
        adherence: adherence || [],
        medications: meds || [],
        activitiesByDay,
        takerUserId,
        name: taker.display_name_ko || '대상자',
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addMed = async () => {
    if (!medName.trim() || !data?.takerUserId) return;
    try {
      await api.addMedication(data.takerUserId, medName, medAmt, medUnit, user?.id || '', medTimes, false);
      setMedName('');
      setMedAmt('');
      setMedTimes(['09:00']);
      load();
    } catch (e: any) {
      Alert.alert('오류', e.message);
    }
  };

  const openEdit = (med: any) => {
    setEditing(med);
    setEditName(med.name_ko || med.name_en || '');
    setEditAmt(String(med.dosage_amount || ''));
    setEditUnit(med.dosage_unit || 'mg');
    setEditTimes(med.medication_schedules?.map((s: any) => s.time_of_day?.substring(0, 5)) || ['09:00']);
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await api.updateMedication(editing.id, editName, editAmt, editUnit, editTimes);
      setEditing(null);
      load();
    } catch (e: any) {
      Alert.alert('오류', e.message);
    }
  };

  const nudge = async () => {
    if (!data?.takerUserId) return;
    try {
      const res = await api.sendNudgeNotification(data.takerUserId, '', profile?.name_ko || '보호자');
      Alert.alert(res.success ? '알림 전송' : '실패', res.success ? '약 복용 알림을 보냈습니다.' : res.message);
    } catch (e: any) {
      Alert.alert('실패', e.message ?? '알림 전송 실패');
    }
  };

  const disconnect = () => {
    Alert.alert('연결 해제', '이 대상자와의 연결을 해제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '해제',
        style: 'destructive',
        onPress: async () => {
          if (!user?.id || !takerId) return;
          try {
            const circleId = await api.getTakerCircleId(takerId);
            if (circleId) {
              await api.leaveCareCircle(user.id, circleId);
              router.back();
            }
          } catch (e) {
            console.error(e);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#0F766E" />
      </SafeAreaView>
    );
  }

  if (!accepted) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-4 bg-background px-8">
        <Ionicons name="time-outline" size={56} color="#f59e0b" />
        <Text className="text-center text-xl font-bold text-foreground">수락 대기 중</Text>
        <Text className="text-center text-sm text-muted-foreground">
          대상자가 요청을 수락해야 건강 데이터를 볼 수 있습니다.
        </Text>
        <Pressable onPress={() => router.back()} className="rounded-xl border border-border px-6 py-3">
          <Text className="text-foreground">돌아가기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-secondary">
      {/* Header */}
      <View className="flex-row items-center gap-2 border-b border-border bg-background px-3 py-3">
        <Pressable onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#18181b" />
        </Pressable>
        <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Text className="font-bold text-primary">{data?.name?.charAt(0)}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-foreground">{data?.name}</Text>
          <Text className="text-[11px] text-muted-foreground">돌봄 대시보드</Text>
        </View>
      </View>

      {/* Tabs */}
      <View className="bg-background px-4 pb-2 pt-2">
        <View className="flex-row rounded-xl bg-secondary p-1">
          {(
            [
              { k: 'overview', l: '현황' },
              { k: 'health', l: '건강관리' },
              { k: 'circle', l: '연결' },
            ] as const
          ).map((tt) => (
            <Pressable
              key={tt.k}
              onPress={() => setTab(tt.k)}
              className={`flex-1 items-center rounded-lg py-2 ${tab === tt.k ? 'bg-background shadow-sm' : ''}`}
            >
              <Text className={tab === tt.k ? 'font-semibold text-primary' : 'text-muted-foreground'}>
                {tt.l}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView contentContainerClassName="p-4 gap-4 pb-10">
        {tab === 'overview' && (
          <>
            <View className="flex-row gap-2">
              {[
                { label: '체크인', value: data?.checkinDone ? '완료' : '대기' },
                { label: '복용', value: `${data?.medsTaken}/${data?.medsTotal}` },
                { label: '최근 혈압', value: data?.lastBP },
              ].map((c) => (
                <View key={c.label} className="flex-1 rounded-xl bg-background p-3 shadow-sm">
                  <Text className="text-[11px] text-muted-foreground">{c.label}</Text>
                  <Text className="mt-1 text-sm font-bold text-foreground">{c.value}</Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={nudge}
              className="h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-orange-500"
            >
              <Ionicons name="notifications" size={20} color="#fff" />
              <Text className="text-base font-bold text-white">약 복용 재촉하기</Text>
            </Pressable>

            {weekDays.length > 0 && (
              <View
                style={{
                  backgroundColor: COLORS.paper,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: COLORS.lineSoft,
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.ink[900] }}>
                    주간 활동
                  </Text>
                  <Text style={{ fontSize: 11, color: COLORS.ink[500] }}>
                    날짜를 눌러 활동 보기
                  </Text>
                </View>

                {/* Day strip */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  {weekDays.map((wd) => {
                    const [dayName, dateStr] = wd.day.split(' ');
                    const isFull = wd.rate >= 100;
                    const isHigh = wd.rate >= 60;
                    const dotBg = isFull
                      ? COLORS.teal[700]
                      : isHigh
                        ? COLORS.teal[200]
                        : COLORS.sand[100];
                    const dotFg = isFull
                      ? 'white'
                      : isHigh
                        ? COLORS.teal[800]
                        : COLORS.warn[500];
                    const isActive = wd.ds === activeDayDs;
                    return (
                      <Pressable
                        key={wd.ds}
                        onPress={() => setSelectedDay(wd.ds)}
                        hitSlop={4}
                        style={{ alignItems: 'center', gap: 6 }}
                      >
                        <Text style={{ fontSize: 11, color: COLORS.ink[500], fontWeight: '600' }}>
                          {dayName}
                        </Text>
                        <View
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: dotBg,
                            borderWidth: isActive ? 2 : 0,
                            borderColor: COLORS.teal[700],
                          }}
                        >
                          <Text
                            style={{
                              color: dotFg,
                              fontSize: 11,
                              fontWeight: '600',
                              fontVariant: ['tabular-nums'],
                            }}
                          >
                            {wd.rate}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 10, color: COLORS.ink[400] }}>{dateStr}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Selected day activities */}
                <View
                  style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: COLORS.lineSoft,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: COLORS.ink[500],
                      fontWeight: '600',
                      marginBottom: 8,
                    }}
                  >
                    {format(new Date(activeDayDs), 'M월 d일')}{' '}
                    {activeDayDs === todayDs ? '· 오늘' : ''} 활동
                  </Text>
                  {dayActivities.length > 0 ? (
                    dayActivities.map((a) => (
                      <View
                        key={a.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          paddingVertical: 8,
                          borderBottomWidth: 1,
                          borderBottomColor: COLORS.lineSoft,
                        }}
                      >
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: COLORS.teal[700],
                          }}
                        />
                        <Text style={{ flex: 1, fontSize: 13, color: COLORS.ink[900] }}>
                          {a.desc}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: COLORS.ink[500],
                            fontVariant: ['tabular-nums'],
                          }}
                        >
                          {format(a.time, 'HH:mm')}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text
                      style={{
                        paddingVertical: 18,
                        textAlign: 'center',
                        fontSize: 12,
                        color: COLORS.ink[500],
                      }}
                    >
                      이 날의 기록이 없습니다.
                    </Text>
                  )}
                </View>
              </View>
            )}
          </>
        )}

        {tab === 'health' && (
          <>
            <View className="gap-2 rounded-2xl bg-background p-4 shadow-sm">
              <Text className="text-sm font-bold text-foreground">약 추가</Text>
              <TextInput
                value={medName}
                onChangeText={setMedName}
                placeholder="약 이름"
                placeholderTextColor="#a1a1aa"
                className="h-11 rounded-lg border border-border px-3 text-base text-foreground"
              />
              <View className="flex-row gap-2">
                <TextInput
                  value={medAmt}
                  onChangeText={setMedAmt}
                  placeholder="용량"
                  placeholderTextColor="#a1a1aa"
                  className="h-11 flex-[2] rounded-lg border border-border px-3 text-base text-foreground"
                />
                <TextInput
                  value={medUnit}
                  onChangeText={setMedUnit}
                  className="h-11 flex-1 rounded-lg border border-border px-3 text-base text-foreground"
                />
              </View>
              {medTimes.map((tm, i) => (
                <TextInput
                  key={i}
                  value={tm}
                  onChangeText={(v) => setMedTimes((p) => p.map((x, ix) => (ix === i ? v : x)))}
                  placeholder="09:00"
                  placeholderTextColor="#a1a1aa"
                  className="h-11 rounded-lg border border-border px-3 text-base text-foreground"
                />
              ))}
              <Pressable onPress={() => setMedTimes((p) => [...p, '09:00'])}>
                <Text className="text-sm text-primary">+ 시간 추가</Text>
              </Pressable>
              <Pressable
                onPress={addMed}
                className="h-11 items-center justify-center rounded-lg bg-primary"
              >
                <Text className="font-semibold text-primary-foreground">약 추가 (수락 필요)</Text>
              </Pressable>
            </View>

            {data?.medications?.map((med: any) => (
              <View key={med.id} className="rounded-2xl bg-background p-3 shadow-sm">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-sm font-bold text-foreground">
                      {med.name_ko || med.name_en}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {med.dosage_amount}
                      {med.dosage_unit}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Pressable
                      onPress={async () => {
                        await api.toggleMedicationActive(med.id, !med.is_active);
                        load();
                      }}
                    >
                      <Ionicons
                        name={med.is_active ? 'toggle' : 'toggle-outline'}
                        size={28}
                        color={med.is_active ? '#0F766E' : '#a1a1aa'}
                      />
                    </Pressable>
                    <Pressable onPress={() => openEdit(med)} className="p-1">
                      <Ionicons name="pencil" size={16} color="#0F766E" />
                    </Pressable>
                    <Pressable
                      onPress={async () => {
                        await api.deleteMedication(med.id);
                        load();
                      }}
                      className="p-1"
                    >
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        {tab === 'circle' && (
          <View className="gap-3 rounded-2xl border border-destructive/20 bg-background p-4">
            <Text className="text-sm font-bold text-destructive">연결 해제</Text>
            <Text className="text-xs text-muted-foreground">
              연결을 해제하면 더 이상 이 대상자의 건강 정보를 볼 수 없습니다.
            </Text>
            <Pressable
              onPress={disconnect}
              className="h-11 items-center justify-center rounded-lg bg-destructive"
            >
              <Text className="font-semibold text-destructive-foreground">연결 해제</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Edit med modal */}
      <Modal visible={!!editing} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-background">
          <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
            <Text className="text-lg font-bold text-foreground">약 정보 수정</Text>
            <Pressable onPress={() => setEditing(null)}>
              <Ionicons name="close" size={26} color="#71717a" />
            </Pressable>
          </View>
          <ScrollView contentContainerClassName="p-4 gap-3">
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="약 이름"
              placeholderTextColor="#a1a1aa"
              className="h-12 rounded-xl border border-border px-3 text-base text-foreground"
            />
            <View className="flex-row gap-2">
              <TextInput
                value={editAmt}
                onChangeText={setEditAmt}
                className="h-12 flex-[2] rounded-xl border border-border px-3 text-base text-foreground"
              />
              <TextInput
                value={editUnit}
                onChangeText={setEditUnit}
                className="h-12 flex-1 rounded-xl border border-border px-3 text-base text-foreground"
              />
            </View>
            {editTimes.map((tm, i) => (
              <TextInput
                key={i}
                value={tm}
                onChangeText={(v) => setEditTimes((p) => p.map((x, ix) => (ix === i ? v : x)))}
                className="h-12 rounded-xl border border-border px-3 text-base text-foreground"
              />
            ))}
            <Pressable onPress={() => setEditTimes((p) => [...p, '09:00'])}>
              <Text className="text-sm text-primary">+ 시간 추가</Text>
            </Pressable>
            <Pressable
              onPress={saveEdit}
              className="h-12 items-center justify-center rounded-xl bg-primary"
            >
              <Text className="font-semibold text-primary-foreground">저장하기</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
