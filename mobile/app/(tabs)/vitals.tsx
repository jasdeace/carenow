import { useEffect, useState } from 'react';
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

import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { LineChartMini } from '@/components/LineChartMini';
import { pickImage } from '@/lib/camera';
import { processImageOCR } from '@/lib/ocr';

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

function Section({
  title,
  icon,
  color,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View className="overflow-hidden rounded-2xl bg-background shadow-sm">
      <Pressable onPress={onToggle} className="flex-row items-center justify-between p-4">
        <View className="flex-row items-center gap-2">
          <Ionicons name={icon} size={22} color={color} />
          <Text className="text-lg font-bold text-foreground">{title}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color="#a1a1aa" />
      </Pressable>
      {open && <View className="px-4 pb-4">{children}</View>}
    </View>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View className="flex-1">
      <Text className="mb-1 text-sm text-muted-foreground">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        className="h-14 rounded-xl bg-secondary text-center text-xl text-foreground"
      />
    </View>
  );
}

function SaveButton({ onPress, loading }: { onPress: () => void; loading: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      className={`mt-4 h-14 items-center justify-center rounded-xl bg-primary ${loading ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <Text className="text-lg font-semibold text-primary-foreground">저장</Text>
      )}
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
  const bodyFatPct =
    Number(bcWeight) > 0 && Number(bcFat) > 0
      ? Number(((Number(bcFat) / Number(bcWeight)) * 100).toFixed(1))
      : 0;

  const [weekly, setWeekly] = useState<any[]>([]);
  const [bp, setBp] = useState<any[]>([]);
  const [glucose, setGlucose] = useState<any[]>([]);
  const [weight, setWeight] = useState<any[]>([]);

  const [sys, setSys] = useState('120');
  const [dia, setDia] = useState('80');
  const [pulse, setPulse] = useState('72');
  const [glucoseVal, setGlucoseVal] = useState('100');
  const [timing, setTiming] = useState('fasting');
  const [weightVal, setWeightVal] = useState('60.0');
  const [kbHeight, setKbHeight] = useState(0);

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
      if (w) setBcWeight(w);
      if (sm) setBcMuscle(sm);
      if (bf) setBcFat(bf);
      if (!w && !sm && !bf) {
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
        body_fat_pct: bodyFatPct,
        source: 'manual',
      });
      setBcWeight('');
      setBcMuscle('');
      setBcFat('');
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

  const dateOf = (e: any) => new Date(e.measured_at || e.created_at);
  const chartData = (arr: any[]) => [...arr].reverse();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-secondary">
      <ScrollView
        contentContainerClassName="p-4 gap-4"
        contentContainerStyle={{ paddingBottom: 40 + kbHeight }}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-2xl font-bold text-foreground">{t('vitals.title')}</Text>

        {/* Weekly adherence */}
        {weekly.length > 0 && (
          <View className="rounded-2xl bg-background p-4 shadow-sm">
            <Text className="mb-3 text-base font-bold text-foreground">주간 복용 기록</Text>
            <View className="flex-row justify-between">
              {weekly.map((entry: any, i: number) => {
                const [dayName, dateStr] = entry.day.split(' ');
                const full = entry.rate === 100;
                const partial = entry.rate > 0 && entry.rate < 100;
                return (
                  <View key={i} className="items-center gap-1">
                    <Text className="text-[10px] text-muted-foreground">{dayName}</Text>
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
                      ) : partial ? (
                        <Text className="text-[9px] font-bold text-yellow-600">{entry.rate}</Text>
                      ) : (
                        <Text className="text-xs text-muted-foreground">-</Text>
                      )}
                    </View>
                    <Text className="text-[9px] text-muted-foreground">{dateStr}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Blood pressure */}
        {vis.bp && (
          <Section
            title={t('vitals.bp_title')}
            icon="heart"
            color="#f43f5e"
            open={open.bp}
            onToggle={() => setOpen((o) => ({ ...o, bp: !o.bp }))}
          >
            {bp.length >= 2 && (
              <LineChartMini
                series={[
                  { values: chartData(bp).map((e) => e.systolic), color: '#f43f5e' },
                  { values: chartData(bp).map((e) => e.diastolic), color: '#3b82f6' },
                ]}
              />
            )}
            {bp.slice(0, 6).map((e) => (
              <View
                key={e.id}
                className="mt-1.5 flex-row items-center justify-between rounded-xl bg-secondary px-3 py-2.5"
              >
                <Text className="text-sm text-foreground">
                  <Text className="font-bold text-rose-500">{e.systolic}</Text>
                  {' / '}
                  <Text className="font-bold text-blue-500">{e.diastolic}</Text>
                  <Text className="text-muted-foreground">
                    {'  '}
                    {format(dateOf(e), 'M/d HH:mm')}
                    {e.pulse ? `  맥박 ${e.pulse}` : ''}
                  </Text>
                </Text>
                <Pressable onPress={() => submit(() => api.deleteVitalBP(e.id))}>
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </Pressable>
              </View>
            ))}
            <View className="mt-3 flex-row gap-3">
              <NumField label={t('vitals.sys')} value={sys} onChange={setSys} />
              <NumField label={t('vitals.dia')} value={dia} onChange={setDia} />
              <NumField label={t('vitals.pulse')} value={pulse} onChange={setPulse} />
            </View>
            <SaveButton
              loading={loading}
              onPress={() =>
                submit(() =>
                  api.logVitalBP(user!.id, Number(sys), Number(dia), pulse ? Number(pulse) : undefined),
                )
              }
            />
          </Section>
        )}

        {/* Glucose */}
        {vis.glucose && (
          <Section
            title={t('vitals.glucose_title')}
            icon="water"
            color="#3b82f6"
            open={open.glucose}
            onToggle={() => setOpen((o) => ({ ...o, glucose: !o.glucose }))}
          >
            {glucose.length >= 2 && (
              <LineChartMini
                series={[
                  { values: chartData(glucose).map((e) => e.value_mmol), color: '#3b82f6' },
                ]}
              />
            )}
            {glucose.slice(0, 6).map((e) => (
              <View
                key={e.id}
                className="mt-1.5 flex-row items-center justify-between rounded-xl bg-secondary px-3 py-2.5"
              >
                <Text className="text-sm text-foreground">
                  <Text className="text-lg font-bold text-blue-500">{e.value_mmol}</Text>
                  <Text className="text-muted-foreground">
                    {'  '}
                    {format(dateOf(e), 'M/d HH:mm')} · {timingLabel(e.measurement_timing)}
                  </Text>
                </Text>
                <Pressable onPress={() => submit(() => api.deleteVitalGlucose(e.id))}>
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </Pressable>
              </View>
            ))}
            <View className="mt-3">
              <NumField label={t('vitals.glucose_level')} value={glucoseVal} onChange={setGlucoseVal} />
            </View>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {TIMINGS.map((tm) => (
                <Pressable
                  key={tm.key}
                  onPress={() => setTiming(tm.key)}
                  className={`rounded-lg border px-3 py-2 ${
                    timing === tm.key ? 'border-primary bg-primary/10' : 'border-border'
                  }`}
                >
                  <Text className={timing === tm.key ? 'font-bold text-primary' : 'text-foreground'}>
                    {tm.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <SaveButton
              loading={loading}
              onPress={() =>
                submit(() => api.logVitalGlucose(user!.id, Number(glucoseVal), timing))
              }
            />
          </Section>
        )}

        {/* Weight */}
        {vis.weight && (
          <Section
            title={t('vitals.weight_title')}
            icon="scale"
            color="#16a34a"
            open={open.weight}
            onToggle={() => setOpen((o) => ({ ...o, weight: !o.weight }))}
          >
            {weight.length >= 2 && (
              <LineChartMini
                series={[{ values: chartData(weight).map((e) => e.weight_kg), color: '#16a34a' }]}
              />
            )}
            {weight.slice(0, 6).map((e) => (
              <View
                key={e.id}
                className="mt-1.5 flex-row items-center justify-between rounded-xl bg-secondary px-3 py-2.5"
              >
                <Text className="text-sm text-foreground">
                  <Text className="text-lg font-bold text-emerald-500">{e.weight_kg} kg</Text>
                  <Text className="text-muted-foreground">{'  '}{format(dateOf(e), 'M/d HH:mm')}</Text>
                </Text>
                <Pressable onPress={() => submit(() => api.deleteVitalWeight(e.id))}>
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </Pressable>
              </View>
            ))}
            <View className="mt-3">
              <NumField label={t('vitals.weight_kg')} value={weightVal} onChange={setWeightVal} />
            </View>
            <SaveButton
              loading={loading}
              onPress={() => submit(() => api.logVitalWeight(user!.id, Number(weightVal)))}
            />
          </Section>
        )}

        {/* Body composition (InBody) */}
        <Section
          title="체성분 (InBody)"
          icon="body"
          color="#8b5cf6"
          open={open.body}
          onToggle={() => setOpen((o) => ({ ...o, body: !o.body }))}
        >
          <Pressable
            onPress={scanInBody}
            disabled={ocrLoading}
            className="mt-1 h-16 flex-row items-center justify-center gap-2 rounded-xl border border-violet-300 bg-violet-50"
          >
            {ocrLoading ? (
              <ActivityIndicator color="#8b5cf6" />
            ) : (
              <>
                <Ionicons name="camera" size={20} color="#8b5cf6" />
                <Text className="font-medium text-violet-600">InBody 결과지 촬영</Text>
              </>
            )}
          </Pressable>

          {bodyComp.slice(0, 6).map((e) => (
            <View key={e.id} className="mt-1.5 rounded-xl bg-secondary px-3 py-2.5">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-bold text-violet-600">{e.weight_kg} kg</Text>
                <Pressable onPress={() => submit(() => api.deleteBodyComposition(e.id))}>
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </Pressable>
              </View>
              <Text className="text-xs text-muted-foreground">
                골격근 {e.skeletal_muscle_kg}kg · 체지방 {e.body_fat_kg}kg · 체지방률{' '}
                {e.body_fat_pct}%{'  '}
                {format(new Date(e.recorded_at), 'M/d')}
              </Text>
            </View>
          ))}

          <View className="mt-3 flex-row gap-3">
            <NumField label="체중 (kg)" value={bcWeight} onChange={setBcWeight} />
            <NumField label="골격근량 (kg)" value={bcMuscle} onChange={setBcMuscle} />
          </View>
          <View className="mt-3 flex-row gap-3">
            <NumField label="체지방량 (kg)" value={bcFat} onChange={setBcFat} />
            <View className="flex-1">
              <Text className="mb-1 text-sm text-muted-foreground">체지방률 (%)</Text>
              <View className="h-14 items-center justify-center rounded-xl bg-secondary/60">
                <Text className="text-xl text-muted-foreground">{bodyFatPct || '-'}</Text>
              </View>
            </View>
          </View>
          <SaveButton loading={loading} onPress={saveBodyComp} />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
