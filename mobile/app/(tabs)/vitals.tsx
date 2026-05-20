import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';

import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { LineChartMini } from '@/components/LineChartMini';
import { pickImage } from '@/lib/camera';
import { processImageOCR } from '@/lib/ocr';
import { COLORS } from '@/constants/design';

// Pull a numeric value out of an OCR metrics object by key keywords.
function findMetric(metrics: any, keywords: string[]): string {
  if (!metrics || typeof metrics !== 'object') return '';
  for (const [k, v] of Object.entries(metrics)) {
    const key = k.toLowerCase();
    if (keywords.some((kw) => key.includes(kw.toLowerCase()))) {
      const m = String(v ?? '').match(/-?[\d.]+/);
      if (m) return m[0];
    }
  }
  return '';
}

const TIMINGS = [
  { key: 'fasting', label: '공복' },
  { key: 'pre_meal', label: '식전' },
  { key: 'post_meal', label: '식후' },
  { key: 'bedtime', label: '취침 전' },
];
const timingLabel = (k: string) => TIMINGS.find((tt) => tt.key === k)?.label || k;

const RANGE_OPTIONS = [
  { days: 7, label: '7일' },
  { days: 30, label: '30일' },
  { days: 90, label: '90일' },
  { days: null, label: '전체' },
] as const;

// Pill icon helper for section headers
function IconTile({
  bg,
  fg,
  name,
}: {
  bg: string;
  fg: string;
  name: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={name} size={18} color={fg} />
    </View>
  );
}

function SectionCard({
  title,
  iconBg,
  iconFg,
  iconName,
  subtitle,
  open,
  onToggle,
  children,
  headerExtra,
}: {
  title: string;
  iconBg: string;
  iconFg: string;
  iconName: keyof typeof Ionicons.glyphMap;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: COLORS.paper,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: COLORS.lineSoft,
        marginBottom: 12,
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={onToggle}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 14,
          gap: 12,
        }}
      >
        <IconTile bg={iconBg} fg={iconFg} name={iconName} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.ink[900] }}>
            {title}
          </Text>
          {subtitle && (
            <Text style={{ fontSize: 11.5, color: COLORS.ink[500], marginTop: 1 }}>
              {subtitle}
            </Text>
          )}
        </View>
        {headerExtra}
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={COLORS.ink[300]}
        />
      </Pressable>
      {open && <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>{children}</View>}
    </View>
  );
}

function NumField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 12.5, color: COLORS.ink[500], fontWeight: '600', marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.ink[300]}
        keyboardType="numeric"
        style={{
          height: 54,
          borderRadius: 12,
          backgroundColor: COLORS.cream[100],
          textAlign: 'center',
          fontSize: 20,
          fontWeight: '500',
          color: COLORS.ink[900],
        }}
      />
    </View>
  );
}

function SaveButton({ onPress, loading }: { onPress: () => void; loading: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => ({
        marginTop: 16,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        backgroundColor: COLORS.teal[700],
        opacity: loading ? 0.5 : pressed ? 0.92 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <Text style={{ color: 'white', fontSize: 15, fontWeight: '600' }}>저장</Text>
      )}
    </Pressable>
  );
}

function RangeChips({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
      {RANGE_OPTIONS.map((r) => {
        const active = value === r.days;
        return (
          <Pressable
            key={String(r.days)}
            onPress={() => onChange(r.days)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 9999,
              backgroundColor: active ? COLORS.teal[700] : COLORS.cream[100],
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: active ? 'white' : COLORS.ink[500],
              }}
            >
              {r.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TimingChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 9999,
        backgroundColor: active ? COLORS.ink[900] : COLORS.cream[100],
      }}
    >
      <Text
        style={{
          fontSize: 12.5,
          fontWeight: '600',
          color: active ? 'white' : COLORS.ink[500],
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ShowMoreButton({
  open,
  totalHidden,
  onPress,
}: {
  open: boolean;
  totalHidden: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        marginTop: 10,
        height: 38,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: COLORS.line,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.ink[500] }}>
        {open ? '접기' : `더 보기 (${totalHidden}개 더)`}
      </Text>
      <Ionicons
        name={open ? 'chevron-up' : 'chevron-down'}
        size={14}
        color={COLORS.ink[500]}
      />
    </Pressable>
  );
}

export default function Vitals() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const [vis, setVis] = useState({ bp: true, glucose: true, weight: true });
  const [open, setOpen] = useState({ bp: true, glucose: true, weight: true, body: true });
  const [loading, setLoading] = useState(false);

  const [bodyComp, setBodyComp] = useState<any[]>([]);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [bcWeight, setBcWeight] = useState('');
  const [bcMuscle, setBcMuscle] = useState('');
  const [bcFat, setBcFat] = useState('');
  const [bcPct, setBcPct] = useState('');
  // tracks whether 체지방량(kg) or 체지방률(%) was last edited — used when 체중 changes
  // so we recompute the other field from the user-authoritative one.
  const lastBcEditRef = useRef<'fat' | 'pct'>('fat');

  const [weekly, setWeekly] = useState<any[]>([]);
  const [bp, setBp] = useState<any[]>([]);
  const [glucose, setGlucose] = useState<any[]>([]);
  const [weight, setWeight] = useState<any[]>([]);

  const [sys, setSys] = useState('');
  const [dia, setDia] = useState('');
  const [pulse, setPulse] = useState('');
  const [glucoseVal, setGlucoseVal] = useState('');
  const [timing, setTiming] = useState('fasting');
  const [weightVal, setWeightVal] = useState('');
  const [kbHeight, setKbHeight] = useState(0);

  const [chartRange, setChartRange] = useState<number | null>(30);
  const [showAll, setShowAll] = useState({
    bp: false,
    glucose: false,
    weight: false,
    body: false,
  });

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => setKbHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    (async () => {
      const entries = await AsyncStorage.multiGet([
        'vitals_show_bp',
        'vitals_show_glucose',
        'vitals_show_weight',
      ]);
      setVis({
        bp: entries[0][1] !== 'false',
        glucose: entries[1][1] !== 'false',
        weight: entries[2][1] !== 'false',
      });
    })();
  }, []);

  useEffect(() => {
    if (user?.id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const load = async () => {
    if (!user?.id) return;
    try {
      const [b, g, w, wk, bc] = await Promise.all([
        api.getVitalsBP(user.id),
        api.getVitalsGlucose(user.id),
        api.getVitalsWeight(user.id),
        api.getWeeklyAdherence(user.id),
        api.getBodyComposition(user.id),
      ]);
      setBp(b || []);
      setGlucose(g || []);
      setWeight(w || []);
      setWeekly(wk || []);
      setBodyComp(bc || []);
    } catch (e) {
      console.error(e);
    }
  };

  const onChangeBcFat = (v: string) => {
    setBcFat(v);
    lastBcEditRef.current = 'fat';
    const w = Number(bcWeight);
    if (w > 0 && Number(v) > 0) setBcPct(((Number(v) / w) * 100).toFixed(1));
    else if (!v) setBcPct('');
  };
  const onChangeBcPct = (v: string) => {
    setBcPct(v);
    lastBcEditRef.current = 'pct';
    const w = Number(bcWeight);
    if (w > 0 && Number(v) > 0) setBcFat(((w * Number(v)) / 100).toFixed(1));
    else if (!v) setBcFat('');
  };
  const onChangeBcWeight = (v: string) => {
    setBcWeight(v);
    const w = Number(v);
    if (w > 0) {
      if (lastBcEditRef.current === 'pct' && Number(bcPct) > 0) {
        setBcFat(((w * Number(bcPct)) / 100).toFixed(1));
      } else if (Number(bcFat) > 0) {
        setBcPct(((Number(bcFat) / w) * 100).toFixed(1));
      }
    }
  };

  const scanInBody = async () => {
    const b64 = await pickImage('camera', { quality: 0.85, maxWidth: 1800 });
    if (!b64) return;
    setOcrLoading(true);
    try {
      const result = await processImageOCR([b64]);
      const m = result.parsedData?.metrics ?? result.parsedData ?? {};
      const w = findMetric(m, ['체중', 'weight']);
      const sm = findMetric(m, ['골격근', 'smm']);
      const bf = findMetric(m, ['체지방량', 'body fat mass', 'bfm']);
      const pct = findMetric(m, ['체지방률', 'body fat percent', 'pbf']);
      if (w) setBcWeight(w);
      if (sm) setBcMuscle(sm);
      if (bf) setBcFat(bf);
      if (pct) setBcPct(pct);
      else if (w && bf) setBcPct(((Number(bf) / Number(w)) * 100).toFixed(1));
      if (!w && !sm && !bf && !pct) {
        Alert.alert('인식 실패', 'InBody 수치를 찾지 못했습니다. 직접 입력해주세요.');
      }
    } catch (e: any) {
      Alert.alert('인식 실패', e?.message || '다시 시도해주세요');
    } finally {
      setOcrLoading(false);
    }
  };

  const saveBodyComp = () =>
    submit(async () => {
      await api.logBodyComposition(user!.id, {
        weight_kg: Number(bcWeight) || 0,
        skeletal_muscle_kg: Number(bcMuscle) || 0,
        body_fat_kg: Number(bcFat) || 0,
        body_fat_pct: Number(bcPct) || 0,
        source: 'manual',
      });
      setBcWeight('');
      setBcMuscle('');
      setBcFat('');
      setBcPct('');
    });

  const submit = async (fn: () => Promise<any>) => {
    if (!user?.id) return;
    setLoading(true);
    try {
      await fn();
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const dateOf = (e: any) => new Date(e.measured_at || e.created_at || e.recorded_at);
  const filterByRange = (arr: any[]) => {
    if (chartRange == null) return arr;
    const cutoff = Date.now() - chartRange * 86400000;
    return arr.filter((e) => dateOf(e).getTime() >= cutoff);
  };
  const chartData = (arr: any[]) => [...filterByRange(arr)].reverse();
  const visibleRows = <T,>(arr: T[], key: keyof typeof showAll): T[] =>
    showAll[key] ? arr : arr.slice(0, 3);

  const latestBP = bp[0];
  const latestGlucose = glucose[0];
  const latestWeight = weight[0];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: COLORS.cream[50] }}>
      {/* Page header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 4,
          paddingBottom: 6,
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            color: COLORS.ink[900],
            letterSpacing: -0.6,
          }}
        >
          {t('vitals.title')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 32 + kbHeight,
        }}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
      >
        {/* Weekly adherence */}
        {weekly.length > 0 && (
          <View
            style={{
              backgroundColor: COLORS.paper,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: COLORS.lineSoft,
              paddingVertical: 14,
              paddingHorizontal: 14,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: COLORS.ink[900],
                marginBottom: 12,
              }}
            >
              주간 복용 기록
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {weekly.map((entry: any, i: number) => {
                const [dayName, dateStr] = entry.day.split(' ');
                const isFull = entry.rate >= 100;
                const isHigh = entry.rate >= 60;
                const bg = isFull
                  ? COLORS.teal[700]
                  : isHigh
                    ? COLORS.teal[200]
                    : COLORS.sand[100];
                const fg = isFull ? 'white' : isHigh ? COLORS.teal[800] : COLORS.warn[500];
                return (
                  <View key={i} style={{ alignItems: 'center', gap: 4 }}>
                    <Text
                      style={{
                        fontSize: 11,
                        color: COLORS.ink[500],
                        fontWeight: '600',
                      }}
                    >
                      {dayName}
                    </Text>
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: bg,
                        alignItems: 'center',
                        justifyContent: 'center',
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
                        {entry.rate}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 10, color: COLORS.ink[400] }}>{dateStr}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Blood pressure */}
        {vis.bp && (
          <SectionCard
            title={t('vitals.bp_title')}
            iconBg={COLORS.rose[100]}
            iconFg={COLORS.rose[500]}
            iconName="heart"
            subtitle={
              latestBP
                ? `최근 측정 ${format(dateOf(latestBP), 'M/d HH:mm')}`
                : '기록을 추가해 보세요'
            }
            open={open.bp}
            onToggle={() => setOpen((o) => ({ ...o, bp: !o.bp }))}
          >
            {latestBP && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  marginTop: 4,
                  marginBottom: 12,
                  gap: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 38,
                    color: COLORS.rose[500],
                    fontWeight: '700',
                    fontVariant: ['tabular-nums'],
                    letterSpacing: -0.8,
                  }}
                >
                  {latestBP.systolic}
                </Text>
                <Text style={{ color: COLORS.ink[300], fontSize: 22 }}>/</Text>
                <Text
                  style={{
                    fontSize: 38,
                    color: COLORS.sky[500],
                    fontWeight: '700',
                    fontVariant: ['tabular-nums'],
                    letterSpacing: -0.8,
                  }}
                >
                  {latestBP.diastolic}
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.ink[500], marginLeft: 4 }}>
                  mmHg
                </Text>
                {latestBP.pulse ? (
                  <Text style={{ fontSize: 12, color: COLORS.ink[500], marginLeft: 10 }}>
                    맥박{' '}
                    <Text style={{ fontVariant: ['tabular-nums'], color: COLORS.ink[700] }}>
                      {latestBP.pulse}
                    </Text>{' '}
                    bpm
                  </Text>
                ) : null}
              </View>
            )}

            <View style={{ marginBottom: 8 }}>
              <RangeChips value={chartRange} onChange={setChartRange} />
            </View>
            {chartData(bp).length >= 2 ? (
              <LineChartMini
                series={[
                  { values: chartData(bp).map((e) => e.systolic), color: COLORS.rose[500] },
                  { values: chartData(bp).map((e) => e.diastolic), color: COLORS.sky[500] },
                ]}
              />
            ) : (
              <View
                style={{
                  height: 110,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 14,
                  backgroundColor: COLORS.cream[100],
                }}
              >
                <Text style={{ fontSize: 12, color: COLORS.ink[500] }}>기록이 부족합니다</Text>
              </View>
            )}

            <View style={{ marginTop: 14, flexDirection: 'row', gap: 10 }}>
              <NumField label={t('vitals.sys')} value={sys} onChange={setSys} placeholder="120" />
              <NumField label={t('vitals.dia')} value={dia} onChange={setDia} placeholder="80" />
              <NumField label={t('vitals.pulse')} value={pulse} onChange={setPulse} placeholder="72" />
            </View>
            <SaveButton
              loading={loading}
              onPress={() => {
                if (!sys || !dia) {
                  Alert.alert('입력 필요', '수축기/이완기를 입력해주세요.');
                  return;
                }
                submit(async () => {
                  await api.logVitalBP(
                    user!.id,
                    Number(sys),
                    Number(dia),
                    pulse ? Number(pulse) : undefined,
                  );
                  setSys('');
                  setDia('');
                  setPulse('');
                });
              }}
            />

            {bp.length > 0 && (
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: COLORS.ink[500],
                  marginTop: 20,
                  marginBottom: 6,
                  letterSpacing: 0.6,
                }}
              >
                최근 기록 ({bp.length})
              </Text>
            )}
            {visibleRows(bp, 'bp').map((e, i) => (
              <View
                key={e.id}
                style={{
                  marginTop: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: COLORS.lineSoft,
                  backgroundColor: COLORS.cream[50],
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: COLORS.paper,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 8,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.ink[500] }}>
                    {i + 1}
                  </Text>
                </View>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: '700',
                      color: COLORS.rose[500],
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {e.systolic}
                  </Text>
                  <Text style={{ color: COLORS.ink[400], fontSize: 14 }}>/</Text>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: '700',
                      color: COLORS.sky[500],
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {e.diastolic}
                  </Text>
                  <Text style={{ fontSize: 11, color: COLORS.ink[500], marginLeft: 4 }}>
                    mmHg
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ alignItems: 'flex-end' }}>
                    {e.pulse ? (
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '500',
                          color: COLORS.ink[700],
                        }}
                      >
                        ♥ {e.pulse} bpm
                      </Text>
                    ) : null}
                    <Text style={{ fontSize: 11, color: COLORS.ink[500] }}>
                      {format(dateOf(e), 'M/d HH:mm')}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => submit(() => api.deleteVitalBP(e.id))}
                    hitSlop={8}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                  </Pressable>
                </View>
              </View>
            ))}
            {bp.length > 3 && (
              <ShowMoreButton
                open={showAll.bp}
                totalHidden={bp.length - 3}
                onPress={() => setShowAll((s) => ({ ...s, bp: !s.bp }))}
              />
            )}
          </SectionCard>
        )}

        {/* Glucose */}
        {vis.glucose && (
          <SectionCard
            title={t('vitals.glucose_title')}
            iconBg={COLORS.sky[100]}
            iconFg={COLORS.sky[500]}
            iconName="water"
            subtitle={
              latestGlucose
                ? `최근 ${latestGlucose.value_mmol} mg/dL · ${timingLabel(latestGlucose.measurement_timing)}`
                : '기록을 추가해 보세요'
            }
            open={open.glucose}
            onToggle={() => setOpen((o) => ({ ...o, glucose: !o.glucose }))}
          >
            <View style={{ marginBottom: 8 }}>
              <RangeChips value={chartRange} onChange={setChartRange} />
            </View>
            {chartData(glucose).length >= 2 ? (
              <LineChartMini
                series={[
                  { values: chartData(glucose).map((e) => e.value_mmol), color: COLORS.sky[500] },
                ]}
              />
            ) : (
              <View
                style={{
                  height: 110,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 14,
                  backgroundColor: COLORS.cream[100],
                }}
              >
                <Text style={{ fontSize: 12, color: COLORS.ink[500] }}>기록이 부족합니다</Text>
              </View>
            )}

            <View style={{ marginTop: 14 }}>
              <NumField
                label={t('vitals.glucose_level')}
                value={glucoseVal}
                onChange={setGlucoseVal}
                placeholder="100"
              />
            </View>
            <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {TIMINGS.map((tm) => (
                <TimingChip
                  key={tm.key}
                  active={timing === tm.key}
                  label={tm.label}
                  onPress={() => setTiming(tm.key)}
                />
              ))}
            </View>
            <SaveButton
              loading={loading}
              onPress={() => {
                if (!glucoseVal) {
                  Alert.alert('입력 필요', '혈당 수치를 입력해주세요.');
                  return;
                }
                submit(async () => {
                  await api.logVitalGlucose(user!.id, Number(glucoseVal), timing);
                  setGlucoseVal('');
                });
              }}
            />

            {glucose.length > 0 && (
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: COLORS.ink[500],
                  marginTop: 20,
                  marginBottom: 6,
                  letterSpacing: 0.6,
                }}
              >
                최근 기록 ({glucose.length})
              </Text>
            )}
            {visibleRows(glucose, 'glucose').map((e, i) => (
              <View
                key={e.id}
                style={{
                  marginTop: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: COLORS.lineSoft,
                  backgroundColor: COLORS.cream[50],
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: COLORS.paper,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 8,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.ink[500] }}>
                    {i + 1}
                  </Text>
                </View>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: '700',
                      color: COLORS.sky[500],
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {e.value_mmol}
                  </Text>
                  <Text style={{ fontSize: 11, color: COLORS.ink[500], marginLeft: 4 }}>
                    mg/dL
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View
                      style={{
                        backgroundColor: COLORS.sky[100],
                        borderRadius: 9999,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '600',
                          color: COLORS.sky[500],
                        }}
                      >
                        {timingLabel(e.measurement_timing)}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: COLORS.ink[500], marginTop: 2 }}>
                      {format(dateOf(e), 'M/d HH:mm')}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => submit(() => api.deleteVitalGlucose(e.id))}
                    hitSlop={8}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                  </Pressable>
                </View>
              </View>
            ))}
            {glucose.length > 3 && (
              <ShowMoreButton
                open={showAll.glucose}
                totalHidden={glucose.length - 3}
                onPress={() => setShowAll((s) => ({ ...s, glucose: !s.glucose }))}
              />
            )}
          </SectionCard>
        )}

        {/* Weight */}
        {vis.weight && (
          <SectionCard
            title={t('vitals.weight_title')}
            iconBg={COLORS.teal[100]}
            iconFg={COLORS.teal[700]}
            iconName="scale"
            subtitle={
              latestWeight
                ? `최근 ${latestWeight.weight_kg} kg`
                : '기록을 추가해 보세요'
            }
            open={open.weight}
            onToggle={() => setOpen((o) => ({ ...o, weight: !o.weight }))}
          >
            <View style={{ marginBottom: 8 }}>
              <RangeChips value={chartRange} onChange={setChartRange} />
            </View>
            {chartData(weight).length >= 2 ? (
              <LineChartMini
                series={[{ values: chartData(weight).map((e) => e.weight_kg), color: COLORS.teal[700] }]}
              />
            ) : (
              <View
                style={{
                  height: 110,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 14,
                  backgroundColor: COLORS.cream[100],
                }}
              >
                <Text style={{ fontSize: 12, color: COLORS.ink[500] }}>기록이 부족합니다</Text>
              </View>
            )}

            <View style={{ marginTop: 14 }}>
              <NumField
                label={t('vitals.weight_kg')}
                value={weightVal}
                onChange={setWeightVal}
                placeholder="60.0"
              />
            </View>
            <SaveButton
              loading={loading}
              onPress={() => {
                if (!weightVal) {
                  Alert.alert('입력 필요', '체중을 입력해주세요.');
                  return;
                }
                submit(async () => {
                  await api.logVitalWeight(user!.id, Number(weightVal));
                  setWeightVal('');
                });
              }}
            />

            {weight.length > 0 && (
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: COLORS.ink[500],
                  marginTop: 20,
                  marginBottom: 6,
                  letterSpacing: 0.6,
                }}
              >
                최근 기록 ({weight.length})
              </Text>
            )}
            {visibleRows(weight, 'weight').map((e, i) => {
              const prev = weight[i + 1]?.weight_kg;
              const diff = prev != null ? Number((e.weight_kg - prev).toFixed(1)) : null;
              return (
                <View
                  key={e.id}
                  style={{
                    marginTop: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: COLORS.lineSoft,
                    backgroundColor: COLORS.cream[50],
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: COLORS.paper,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 8,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.ink[500] }}>
                      {i + 1}
                    </Text>
                  </View>
                  <View
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 4 }}
                  >
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: '700',
                        color: COLORS.teal[700],
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {e.weight_kg}
                    </Text>
                    <Text style={{ fontSize: 11, color: COLORS.ink[500], marginLeft: 4 }}>kg</Text>
                    {diff !== null && diff !== 0 && (
                      <Text
                        style={{
                          marginLeft: 8,
                          fontSize: 12,
                          fontWeight: '600',
                          color: diff > 0 ? COLORS.coral[500] : COLORS.sky[500],
                        }}
                      >
                        {diff > 0 ? '▲' : '▼'} {Math.abs(diff)}
                      </Text>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 11, color: COLORS.ink[500] }}>
                      {format(dateOf(e), 'M/d HH:mm')}
                    </Text>
                    <Pressable
                      onPress={() => submit(() => api.deleteVitalWeight(e.id))}
                      hitSlop={8}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
            {weight.length > 3 && (
              <ShowMoreButton
                open={showAll.weight}
                totalHidden={weight.length - 3}
                onPress={() => setShowAll((s) => ({ ...s, weight: !s.weight }))}
              />
            )}
          </SectionCard>
        )}

        {/* Body composition (InBody) */}
        <SectionCard
          title="체성분 (InBody)"
          iconBg={COLORS.coral[100]}
          iconFg={COLORS.coral[500]}
          iconName="body"
          subtitle={bodyComp[0] ? `최근 ${bodyComp[0].weight_kg} kg` : 'InBody 결과지를 등록해 보세요'}
          open={open.body}
          onToggle={() => setOpen((o) => ({ ...o, body: !o.body }))}
        >
          <Pressable
            onPress={scanInBody}
            disabled={ocrLoading}
            style={{
              marginTop: 4,
              height: 64,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderRadius: 14,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: COLORS.teal[300],
              backgroundColor: COLORS.teal[50],
            }}
          >
            {ocrLoading ? (
              <ActivityIndicator color={COLORS.teal[700]} />
            ) : (
              <>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"
                    stroke={COLORS.teal[700]}
                    strokeWidth={1.6}
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M12 9.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"
                    stroke={COLORS.teal[700]}
                    strokeWidth={1.6}
                  />
                </Svg>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.teal[800] }}>
                  InBody 결과지 촬영
                </Text>
              </>
            )}
          </Pressable>

          <View style={{ marginTop: 12, flexDirection: 'row', gap: 10 }}>
            <NumField
              label="체중 (kg)"
              value={bcWeight}
              onChange={onChangeBcWeight}
              placeholder="60.0"
            />
            <NumField
              label="골격근량 (kg)"
              value={bcMuscle}
              onChange={setBcMuscle}
              placeholder="25.0"
            />
          </View>
          <View style={{ marginTop: 10, flexDirection: 'row', gap: 10 }}>
            <NumField
              label="체지방량 (kg)"
              value={bcFat}
              onChange={onChangeBcFat}
              placeholder="15.0"
            />
            <NumField
              label="체지방률 (%)"
              value={bcPct}
              onChange={onChangeBcPct}
              placeholder="25.0"
            />
          </View>
          <Text style={{ marginTop: 8, fontSize: 11, color: COLORS.ink[500] }}>
            체지방량과 체지방률은 체중 기준으로 서로 자동 계산됩니다.
          </Text>
          <SaveButton loading={loading} onPress={saveBodyComp} />

          {bodyComp.length > 0 && (
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: COLORS.ink[500],
                marginTop: 20,
                marginBottom: 6,
                letterSpacing: 0.6,
              }}
            >
              최근 기록 ({bodyComp.length})
            </Text>
          )}
          {visibleRows(bodyComp, 'body').map((e, i) => (
            <View
              key={e.id}
              style={{
                marginTop: 8,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: COLORS.lineSoft,
                backgroundColor: COLORS.cream[50],
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: COLORS.paper,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.ink[500] }}>
                      {i + 1}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: '700',
                        color: COLORS.coral[500],
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {e.weight_kg}
                    </Text>
                    <Text style={{ fontSize: 11, color: COLORS.ink[500] }}>kg</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 11, color: COLORS.ink[500] }}>
                    {format(new Date(e.recorded_at), 'M/d')}
                  </Text>
                  <Pressable
                    onPress={() => submit(() => api.deleteBodyComposition(e.id))}
                    hitSlop={8}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                  </Pressable>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[
                  { label: '골격근', value: e.skeletal_muscle_kg, unit: 'kg' },
                  { label: '체지방', value: e.body_fat_kg, unit: 'kg' },
                  { label: '체지방률', value: e.body_fat_pct, unit: '%' },
                ].map((s) => (
                  <View
                    key={s.label}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      backgroundColor: COLORS.paper,
                      borderRadius: 10,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ fontSize: 10, color: COLORS.ink[500] }}>{s.label}</Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: COLORS.ink[900],
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {s.value}
                      <Text style={{ fontSize: 10, color: COLORS.ink[500] }}> {s.unit}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
          {bodyComp.length > 3 && (
            <ShowMoreButton
              open={showAll.body}
              totalHidden={bodyComp.length - 3}
              onPress={() => setShowAll((s) => ({ ...s, body: !s.body }))}
            />
          )}
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}
