import { useCallback, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Rect } from 'react-native-svg';

import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { COLORS } from '@/constants/design';
import { Ring } from '@/components/ui/Ring';

function greetingPrefix() {
  const h = new Date().getHours();
  if (h < 12) return '좋은 아침이에요';
  if (h < 18) return '안녕하세요';
  return '좋은 저녁이에요';
}

const KO_DAYS = ['일', '월', '화', '수', '목', '금', '토'];
function formatDateKicker(d: Date) {
  return `${d.getMonth() + 1}월 ${d.getDate()}일 · ${KO_DAYS[d.getDay()]}요일`;
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

const TINTS: { bg: string; fg: string }[] = [
  { bg: COLORS.rose[100], fg: '#A24652' },
  { bg: COLORS.coral[100], fg: '#A85A45' },
  { bg: COLORS.teal[100], fg: COLORS.teal[800] },
];

function durationLabel(ms: number): string {
  const totalMin = Math.max(1, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function TakerHome() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const [meds, setMeds] = useState<any[]>([]);
  const [weekly, setWeekly] = useState<{ day: string; rate: number }[]>([]);
  const [viewers, setViewers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyViewer, setBusyViewer] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const now = new Date();
  const isToday = isSameDay(selectedDate, now);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]),
  );

  const load = async () => {
    if (!user?.id) return;
    try {
      const [m, p] = await Promise.all([
        api.getTodayMedications(user.id),
        api.getWeeklyAdherence(user.id),
      ]);
      setMeds(m || []);
      setWeekly(p || []);
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

  const isDoseTakenOn = (med: any, timeStr: string, ref: Date) => {
    const ds = ref.toDateString();
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
        is_taken: isDoseTakenOn(med, s.time_of_day || '09:00', selectedDate),
      }));
    })
    .sort((a, b) => a.display_time.localeCompare(b.display_time));

  const goDate = (offset: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    d.setHours(0, 0, 0, 0);
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    if (d.getTime() > todayMidnight.getTime()) return;
    setSelectedDate(d);
  };

  const takeMed = async (dose: Dose) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const [h, m] = dose.display_time.split(':');
    const at = new Date(selectedDate);
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
    const ds = selectedDate.toDateString();
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

  if (loading) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 64 }}>
        <ActivityIndicator color={COLORS.teal[700]} />
      </View>
    );
  }

  const takenCount = doses.filter((d) => d.is_taken).length;
  const totalCount = doses.length;
  const pct = totalCount > 0 ? takenCount / totalCount : 0;
  const pctLabel = Math.round(pct * 100);

  const doseTime = (d: Dose) => {
    const [h, mi] = d.display_time.split(':').map(Number);
    const t = new Date(selectedDate);
    t.setHours(h, mi, 0, 0);
    return t;
  };
  const pending = doses.filter((d) => !d.is_taken);
  const missed = pending.filter((d) => doseTime(d).getTime() < now.getTime());
  const upcoming = isToday
    ? pending.find((d) => doseTime(d).getTime() >= now.getTime())
    : undefined;

  const heroAccent = COLORS.teal[300];

  const hasAnyMedSetup = meds.length > 0;
  let hero: React.ReactNode;
  if (totalCount === 0) {
    hero = (
      <View>
        <Text style={{ color: 'white', fontSize: 19, lineHeight: 26 }}>
          {isToday ? '오늘' : `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일`} 기록된 복용이{'\n'}없어요.
        </Text>
        {!hasAnyMedSetup && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <Text style={{ color: heroAccent, fontSize: 13.5, fontWeight: '600' }}>
              약 등록하러 가기
            </Text>
            <Ionicons name="chevron-forward" size={16} color={heroAccent} />
          </View>
        )}
      </View>
    );
  } else if (isToday && missed.length > 0) {
    const m = missed[0];
    hero = (
      <Text style={{ color: 'white', fontSize: 20, lineHeight: 26 }}>
        <Text style={{ color: heroAccent, fontVariant: ['tabular-nums'] }}>{m.display_time}</Text>{' '}
        {m.name_ko}을{'\n'}
        <Text style={{ color: heroAccent }}>놓치셨어요</Text>
      </Text>
    );
  } else if (upcoming) {
    const remaining = durationLabel(doseTime(upcoming).getTime() - now.getTime());
    hero = (
      <Text style={{ color: 'white', fontSize: 20, lineHeight: 26 }}>
        다음 {upcoming.name_ko}까지{'\n'}
        <Text style={{ color: heroAccent }}>{remaining}</Text>
      </Text>
    );
  } else if (!isToday && pending.length > 0) {
    hero = (
      <Text style={{ color: 'white', fontSize: 20, lineHeight: 26 }}>
        <Text style={{ color: heroAccent, fontVariant: ['tabular-nums'] }}>{pending.length}개</Text>{' '}
        복용을{'\n'}
        <Text style={{ color: heroAccent }}>놓치셨어요</Text>
      </Text>
    );
  } else {
    hero = (
      <Text style={{ color: 'white', fontSize: 20, lineHeight: 26 }}>
        {isToday ? '오늘' : '이 날'} 복용을{'\n'}
        <Text style={{ color: heroAccent }}>모두 마쳤어요</Text>
      </Text>
    );
  }

  const name = profile?.name_ko || '';

  const dateLabel = isToday
    ? '오늘'
    : `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 (${KO_DAYS[selectedDate.getDay()]})`;

  return (
    <View>
      {/* Greeting (today only) */}
      {isToday && (
        <View style={{ paddingTop: 4, paddingBottom: 16 }}>
          <Text
            style={{
              fontSize: 13,
              color: COLORS.ink[500],
              letterSpacing: 0.78,
              fontWeight: '600',
              marginBottom: 8,
            }}
          >
            {formatDateKicker(now)}
          </Text>
          <Text
            style={{
              fontSize: 30,
              fontWeight: '400',
              lineHeight: 35,
              color: COLORS.ink[900],
              letterSpacing: -0.6,
            }}
          >
            {greetingPrefix()},{'\n'}
            {name ? <Text style={{ color: COLORS.teal[700] }}>{name}</Text> : null}
            <Text>님.</Text>
          </Text>
        </View>
      )}

      {/* Date navigator */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: COLORS.paper,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: COLORS.lineSoft,
          paddingHorizontal: 6,
          paddingVertical: 4,
          marginBottom: 14,
        }}
      >
        <Pressable onPress={() => goDate(-1)} hitSlop={8} style={{ padding: 8 }}>
          <Ionicons name="chevron-back" size={20} color={COLORS.ink[500]} />
        </Pressable>
        <Pressable onPress={() => setSelectedDate(new Date())} hitSlop={8}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.ink[900] }}>
            {dateLabel}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => goDate(1)}
          disabled={isToday}
          hitSlop={8}
          style={{ padding: 8 }}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={isToday ? COLORS.ink[300] : COLORS.ink[500]}
          />
        </Pressable>
      </View>

      {/* Hero — selected date's progress. When there are no meds set up at
          all, the whole card becomes a tap target that jumps to /medications
          so a first-time user has an obvious next step. */}
      <Pressable
        onPress={hasAnyMedSetup ? undefined : () => router.push('/medications')}
        disabled={hasAnyMedSetup}
        style={{
          backgroundColor: COLORS.teal[800],
          borderRadius: 24,
          padding: 22,
          overflow: 'hidden',
          marginBottom: 14,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <Text
            style={{
              color: 'rgba(255,255,255,0.75)',
              fontSize: 12,
              fontWeight: '600',
              letterSpacing: 1,
            }}
          >
            {isToday ? '오늘의 복용' : `${selectedDate.getMonth() + 1}.${selectedDate.getDate()} 복용`}
          </Text>
          <Text
            style={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: 13,
              fontVariant: ['tabular-nums'],
            }}
          >
            {takenCount} / {totalCount}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Ring size={84} stroke={9} value={pct} color={COLORS.teal[300]}>
            <Text
              style={{
                fontSize: 26,
                color: 'white',
                fontWeight: '600',
                fontVariant: ['tabular-nums'],
              }}
            >
              {pctLabel}
              <Text style={{ fontSize: 13, opacity: 0.7 }}>%</Text>
            </Text>
          </Ring>
          <View style={{ flex: 1 }}>{hero}</View>
        </View>

        {totalCount > 0 && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            {doses.map((d, i) => (
              <View
                key={`pip-${d.id}-${i}`}
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: d.is_taken ? COLORS.teal[300] : 'rgba(255,255,255,0.18)',
                }}
              />
            ))}
          </View>
        )}
      </Pressable>

      {/* Meds section */}
      <SectionHead
        title={isToday ? '오늘의 약' : `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일의 약`}
        trailing="모두 보기"
        onTrailing={() => router.push('/medications')}
      />
      {doses.length === 0 ? (
        <View
          style={{
            backgroundColor: COLORS.paper,
            borderRadius: 18,
            padding: 18,
            borderWidth: 1,
            borderColor: COLORS.lineSoft,
          }}
        >
          <Text style={{ color: COLORS.ink[500], fontSize: 14 }}>등록된 약이 없습니다.</Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {doses.map((dose, idx) => {
            const tint = TINTS[idx % TINTS.length];
            return (
              <MedRow
                key={`${dose.id}-${idx}`}
                dose={dose}
                tint={tint}
                onTake={() => takeMed(dose)}
                onUndo={() => undoMed(dose)}
              />
            );
          })}
        </View>
      )}

      {/* Weekly adherence — tap a day to jump */}
      {weekly.length > 0 && (
        <>
          <SectionHead title="주간 복용률" subtitle="날짜를 눌러 자세히 보기" />
          <WeekStrip
            weekly={weekly}
            selectedDate={selectedDate}
            onSelect={(d) => setSelectedDate(d)}
          />
        </>
      )}

      {/* Viewers */}
      <View style={{ marginTop: 4 }}>
        <SectionHead title="내 건강을 보는 사람" />
        {viewers.length === 0 ? (
          <View
            style={{
              backgroundColor: COLORS.paper,
              borderRadius: 18,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.lineSoft,
            }}
          >
            <Text style={{ color: COLORS.ink[500], fontSize: 14 }}>
              아직 연결된 사람이 없습니다.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {viewers.map((v) => {
              const info = viewerInfo(v);
              const pendingViewer = !v.accepted_at;
              return (
                <View
                  key={v.id}
                  style={{
                    backgroundColor: pendingViewer ? COLORS.sand[100] : COLORS.paper,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: pendingViewer ? COLORS.sand[200] : COLORS.lineSoft,
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize: 15, fontWeight: '600', color: COLORS.ink[900] }}
                    >
                      {info.name_ko || info.email || '사용자'}
                    </Text>
                    <Text style={{ fontSize: 12.5, color: COLORS.ink[500], marginTop: 2 }}>
                      {pendingViewer ? '수락 대기 중' : '연결됨'}
                    </Text>
                  </View>
                  {busyViewer === v.id ? (
                    <ActivityIndicator size="small" color={COLORS.teal[700]} />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {pendingViewer && (
                        <Pressable
                          onPress={() => acceptViewer(v)}
                          style={{
                            backgroundColor: COLORS.teal[700],
                            borderRadius: 9999,
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                          }}
                        >
                          <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>
                            수락
                          </Text>
                        </Pressable>
                      )}
                      <Pressable onPress={() => removeViewer(v)} style={{ padding: 6 }}>
                        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

function SectionHead({
  title,
  subtitle,
  trailing,
  onTrailing,
}: {
  title: string;
  subtitle?: string;
  trailing?: string;
  onTrailing?: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginTop: 24,
        marginBottom: 12,
      }}
    >
      <View>
        <Text
          style={{
            fontSize: 19,
            fontWeight: '500',
            lineHeight: 22,
            color: COLORS.ink[900],
            letterSpacing: -0.3,
          }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text style={{ fontSize: 12, color: COLORS.ink[500], marginTop: 2 }}>{subtitle}</Text>
        )}
      </View>
      {trailing && (
        <Pressable onPress={onTrailing} hitSlop={8}>
          <Text style={{ fontSize: 13, color: COLORS.teal[700], fontWeight: '600' }}>
            {trailing}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function MedRow({
  dose,
  tint,
  onTake,
  onUndo,
}: {
  dose: Dose;
  tint: { bg: string; fg: string };
  onTake: () => void;
  onUndo: () => void;
}) {
  const taken = dose.is_taken;
  return (
    <View
      style={{
        backgroundColor: COLORS.paper,
        borderRadius: 18,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: COLORS.lineSoft,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        opacity: taken ? 0.78 : 1,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: tint.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Rect x={3} y={9} width={18} height={8} rx={4} stroke={tint.fg} strokeWidth={1.6} />
          <Path d="M12 9v8" stroke={tint.fg} strokeWidth={1.6} />
        </Svg>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{ fontSize: 17, fontWeight: '600', color: COLORS.ink[900] }}
          numberOfLines={1}
        >
          {dose.name_ko}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <Text style={{ fontSize: 12.5, color: COLORS.ink[500], fontVariant: ['tabular-nums'] }}>
            {dose.display_time}
          </Text>
          <View
            style={{
              width: 3,
              height: 3,
              borderRadius: 1.5,
              backgroundColor: COLORS.ink[300],
            }}
          />
          <Text style={{ fontSize: 12.5, color: COLORS.ink[500] }}>
            {dose.dosage_amount}
            {dose.dosage_unit}
          </Text>
        </View>
      </View>
      <Pressable onPress={taken ? onUndo : onTake} hitSlop={6}>
        {taken ? (
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: COLORS.teal[700],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M5 12.5L10 17.5 19.5 7.5"
                stroke="#ffffff"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: COLORS.teal[700],
              borderRadius: 9999,
              paddingHorizontal: 16,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>복용</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

function WeekStrip({
  weekly,
  selectedDate,
  onSelect,
}: {
  weekly: { day: string; rate: number }[];
  selectedDate: Date;
  onSelect: (d: Date) => void;
}) {
  const N = weekly.length;
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  return (
    <View
      style={{
        backgroundColor: COLORS.paper,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: COLORS.lineSoft,
        paddingVertical: 14,
        paddingHorizontal: 14,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {weekly.map((w, i) => {
          const [dayName, dateStr] = w.day.split(' ');
          const d = new Date(todayMidnight);
          d.setDate(d.getDate() - (N - 1 - i));
          const isActive = isSameDay(d, selectedDate);
          return (
            <Pressable
              key={`${dayName}-${i}`}
              onPress={() => onSelect(d)}
              hitSlop={4}
              style={{ alignItems: 'center', gap: 6 }}
            >
              <Text style={{ fontSize: 11, color: COLORS.ink[500], fontWeight: '600' }}>
                {dayName}
              </Text>
              <WeekDot pct={w.rate} active={isActive} />
              <Text style={{ fontSize: 10, color: COLORS.ink[400] }}>{dateStr}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function WeekDot({ pct, active }: { pct: number; active: boolean }) {
  const isFull = pct >= 100;
  const isHigh = pct >= 60;
  const bg = isFull ? COLORS.teal[700] : isHigh ? COLORS.teal[200] : COLORS.sand[100];
  const fg = isFull ? 'white' : isHigh ? COLORS.teal[800] : COLORS.warn[500];
  return (
    <View
      style={{
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: active ? 2 : 0,
        borderColor: COLORS.teal[700],
      }}
    >
      <Text
        style={{
          color: fg,
          fontSize: 11,
          fontWeight: '600',
          fontVariant: ['tabular-nums'],
        }}
      >
        {pct}
      </Text>
    </View>
  );
}
