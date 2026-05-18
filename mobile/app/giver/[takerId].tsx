import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';

type Tab = 'overview' | 'health' | 'circle';

export default function GiverDashboard() {
  const router = useRouter();
  const { takerId } = useLocalSearchParams<{ takerId: string }>();
  const { user, profile } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('overview');

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

      const activities: any[] = [];
      if (checkin)
        activities.push({ id: 'chk', time: new Date(checkin.checked_in_at), desc: '체크인 완료' });
      if (bp?.[0])
        activities.push({
          id: 'bp',
          time: new Date(bp[0].measured_at || bp[0].created_at),
          desc: `혈압 ${bp[0].systolic}/${bp[0].diastolic}`,
        });
      meds?.forEach((m: any) =>
        m.medication_logs?.forEach((l: any) => {
          if (l.status === 'taken')
            activities.push({ id: `med-${l.id}`, time: new Date(l.taken_at), desc: `${m.name_ko} 복용` });
        }),
      );
      activities.sort((a, b) => b.time.getTime() - a.time.getTime());

      setData({
        checkinDone: !!checkin,
        medsTaken: taken,
        medsTotal: meds?.length || 0,
        lastBP: bp?.[0] ? `${bp[0].systolic}/${bp[0].diastolic}` : '--/--',
        adherence: adherence || [],
        medications: meds || [],
        activities,
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
        <ActivityIndicator color="#16a34a" />
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

            {data?.adherence?.length > 0 && (
              <View className="rounded-2xl bg-background p-4 shadow-sm">
                <Text className="mb-3 text-sm font-bold text-foreground">주간 복용률</Text>
                <View className="flex-row justify-between">
                  {data.adherence.map((entry: any, i: number) => {
                    const [dn, ds] = entry.day.split(' ');
                    const full = entry.rate === 100;
                    const partial = entry.rate > 0 && entry.rate < 100;
                    return (
                      <View key={i} className="items-center gap-1">
                        <Text className="text-[10px] text-muted-foreground">{dn}</Text>
                        <View
                          className={`h-8 w-8 items-center justify-center rounded-full border-2 ${
                            full
                              ? 'border-primary bg-primary'
                              : partial
                                ? 'border-yellow-400 bg-yellow-100'
                                : 'border-secondary bg-secondary'
                          }`}
                        >
                          {full ? (
                            <Ionicons name="checkmark" size={14} color="#fff" />
                          ) : (
                            <Text className="text-[9px] text-muted-foreground">
                              {partial ? entry.rate : '-'}
                            </Text>
                          )}
                        </View>
                        <Text className="text-[9px] text-muted-foreground">{ds}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            <View className="rounded-2xl bg-background p-4 shadow-sm">
              <Text className="mb-2 text-sm font-bold text-foreground">활동 내역</Text>
              {data?.activities?.length > 0 ? (
                data.activities.map((a: any) => (
                  <View key={a.id} className="flex-row items-center gap-2 border-b border-border/40 py-2">
                    <View className="h-2 w-2 rounded-full bg-primary" />
                    <Text className="flex-1 text-xs text-foreground">{a.desc}</Text>
                    <Text className="text-[10px] text-muted-foreground">
                      {format(a.time, 'MM/dd HH:mm')}
                    </Text>
                  </View>
                ))
              ) : (
                <Text className="py-6 text-center text-xs text-muted-foreground">기록이 없습니다.</Text>
              )}
            </View>
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
                        color={med.is_active ? '#16a34a' : '#a1a1aa'}
                      />
                    </Pressable>
                    <Pressable onPress={() => openEdit(med)} className="p-1">
                      <Ionicons name="pencil" size={16} color="#16a34a" />
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
