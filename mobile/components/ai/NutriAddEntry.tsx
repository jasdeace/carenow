import { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { pickImage } from '@/lib/camera';

type Props = {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  dateStr: string;
};

const MEAL_TYPES = [
  { key: 'breakfast', label: '아침' },
  { key: 'lunch', label: '점심' },
  { key: 'dinner', label: '저녁' },
  { key: 'snack', label: '간식' },
];
const ACTIVITIES = ['걷기', '달리기', '헬스', '수영', '자전거', '요가', '등산', '테니스'];

export function NutriAddEntry({ open, onClose, onAdded, dateStr }: Props) {
  const { user, profile, fetchProfile } = useAuthStore();
  const [tab, setTab] = useState<'photo' | 'manual' | 'activity'>('photo');
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const [mealDesc, setMealDesc] = useState('');
  const [mealType, setMealType] = useState('lunch');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const [actName, setActName] = useState('');
  const [actDuration, setActDuration] = useState('');
  const [actCalories, setActCalories] = useState('');

  const reset = () => {
    setTab('photo');
    setAiResult(null);
    setMealDesc('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setActName('');
    setActDuration('');
    setActCalories('');
  };
  const close = () => {
    reset();
    onClose();
  };

  const analyzePhoto = async (source: 'camera' | 'library') => {
    if (!user?.id) return;
    if ((profile?.token_balance ?? 0) < 1) {
      Alert.alert('토큰 부족', '토큰을 충전해주세요.');
      return;
    }
    console.log('[meal] opening picker…');
    const b64 = await pickImage(source, { quality: 0.55 });
    if (!b64) {
      console.log('[meal] no image (cancelled/denied)');
      return;
    }
    console.log('[meal] image picked ~', Math.round(b64.length / 1024), 'KB');
    setPreviewUri(b64);
    setLoading(true);
    const t0 = Date.now();
    try {
      console.log('[meal] calling analyze-meal edge function…');
      const result = await api.analyzeMealPhoto(b64);
      console.log('[meal] analyze-meal returned in', Date.now() - t0, 'ms', JSON.stringify(result)?.slice(0, 200));
      if (result?.analysis) {
        const a = result.analysis;
        setAiResult(a);
        setMealDesc(a.description || '');
        setMealType(a.meal_type || 'lunch');
        setCalories(String(a.calories || 0));
        setProtein(String(a.protein_g || 0));
        setCarbs(String(a.carbs_g || 0));
        setFat(String(a.fat_g || 0));
        setTab('manual');
        console.log('[meal] result shown — switched to edit tab');
        // Token bookkeeping runs in the background — never block the UI on it
        api
          .deductToken(user.id, 1, 'meal_analysis')
          .then(() => fetchProfile(user.id))
          .catch((err) => console.log('[meal] token deduct failed:', err?.message));
      } else {
        console.log('[meal] no analysis field in result');
        Alert.alert('분석 실패', '결과를 받지 못했습니다. 다시 시도해주세요.');
      }
    } catch (e: any) {
      const code = e?.code ?? 'UNKNOWN';
      console.log('[meal] analyze-meal FAILED after', Date.now() - t0, 'ms:', code, e?.message, JSON.stringify(e)?.slice(0, 300));
      Alert.alert('분석 실패', `${e?.message || '다시 시도해주세요'}\n\n[${code}]`);
    } finally {
      setLoading(false);
      setPreviewUri(null);
    }
  };

  const saveMeal = async () => {
    if (!user?.id || !mealDesc.trim()) return;
    setLoading(true);
    try {
      await api.addNutritionEntry({
        user_id: user.id,
        entry_date: dateStr,
        entry_type: 'meal',
        meal_type: mealType,
        description: mealDesc,
        calories: Number(calories) || 0,
        protein_g: Number(protein) || 0,
        carbs_g: Number(carbs) || 0,
        fat_g: Number(fat) || 0,
        ai_analysis: aiResult,
      });
      onAdded();
      close();
    } catch (e: any) {
      Alert.alert('저장 실패', e.message ?? '');
    } finally {
      setLoading(false);
    }
  };

  const saveActivity = async () => {
    if (!user?.id || !actName.trim()) return;
    setLoading(true);
    try {
      await api.addNutritionEntry({
        user_id: user.id,
        entry_date: dateStr,
        entry_type: 'activity',
        activity_name: actName,
        duration_minutes: Number(actDuration) || 0,
        calories: -(Number(actCalories) || 0),
      });
      onAdded();
      close();
    } catch (e: any) {
      Alert.alert('저장 실패', e.message ?? '');
    } finally {
      setLoading(false);
    }
  };

  const field = (label: string, value: string, set: (v: string) => void) => (
    <View className="flex-1">
      <Text className="mb-1 text-sm text-muted-foreground">{label}</Text>
      <TextInput
        value={value}
        onChangeText={set}
        keyboardType="numeric"
        className="h-12 rounded-xl border border-border px-3 text-base text-foreground"
      />
    </View>
  );

  // In-app overlay (not an RN <Modal>) — launching the camera from inside an
  // RN Modal on iOS conflicts with native modal presentation.
  if (!open) return null;
  return (
    <View style={[StyleSheet.absoluteFillObject, { zIndex: 50 }]}>
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <Text className="text-lg font-bold text-foreground">기록 추가</Text>
          <Pressable onPress={close}>
            <Ionicons name="close" size={26} color="#71717a" />
          </Pressable>
        </View>

        <View className="flex-row gap-1 bg-secondary p-1" style={{ margin: 16, borderRadius: 12 }}>
          {(
            [
              { k: 'photo', l: '📷 촬영' },
              { k: 'manual', l: '✍️ 식사' },
              { k: 'activity', l: '🏃 활동' },
            ] as const
          ).map((tt) => (
            <Pressable
              key={tt.k}
              onPress={() => setTab(tt.k)}
              className={`flex-1 items-center rounded-lg py-2.5 ${tab === tt.k ? 'bg-background shadow-sm' : ''}`}
            >
              <Text className={tab === tt.k ? 'font-semibold text-primary' : 'text-muted-foreground'}>
                {tt.l}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView
          contentContainerClassName="px-4 pb-8 gap-4"
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          {tab === 'photo' && (
            <View className="gap-3 py-2">
              {loading ? (
                <View className="gap-3 py-2">
                  {previewUri ? (
                    <View className="relative overflow-hidden rounded-2xl bg-secondary">
                      <Image
                        source={{ uri: previewUri }}
                        style={{ width: '100%', height: 260 }}
                        contentFit="cover"
                      />
                      <View className="absolute inset-0 items-center justify-center gap-3 bg-black/45">
                        <ActivityIndicator size="large" color="#ffffff" />
                        <Text className="text-base font-medium text-white">
                          AI가 음식을 분석하고 있습니다...
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View className="items-center gap-3 py-12">
                      <ActivityIndicator size="large" color="#16a34a" />
                      <Text className="text-primary">AI가 음식을 분석하고 있습니다...</Text>
                    </View>
                  )}
                </View>
              ) : (
                <>
                  <Pressable
                    onPress={() => analyzePhoto('camera')}
                    className="h-28 items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary/5"
                  >
                    <Ionicons name="camera" size={32} color="#16a34a" />
                    <Text className="text-base font-medium text-primary">카메라로 촬영</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => analyzePhoto('library')}
                    className="h-28 items-center justify-center gap-2 rounded-2xl border border-violet-300 bg-violet-50"
                  >
                    <Ionicons name="image" size={32} color="#8b5cf6" />
                    <Text className="text-base font-medium text-violet-600">갤러리에서 선택</Text>
                  </Pressable>
                  <Text className="text-center text-xs text-muted-foreground">
                    토큰 1개 차감 (잔여: {profile?.token_balance ?? 0}개)
                  </Text>
                </>
              )}
            </View>
          )}

          {tab === 'manual' && (
            <>
              {aiResult && (
                <View className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <Text className="text-xs font-medium text-emerald-600">
                    🤖 AI 분석 결과 (수정 가능)
                  </Text>
                  {aiResult.notes && (
                    <Text className="mt-1 text-xs text-muted-foreground">{aiResult.notes}</Text>
                  )}
                </View>
              )}
              <View className="flex-row gap-2">
                {MEAL_TYPES.map((mt) => (
                  <Pressable
                    key={mt.key}
                    onPress={() => setMealType(mt.key)}
                    className={`flex-1 items-center rounded-lg border py-2 ${
                      mealType === mt.key ? 'border-primary bg-primary' : 'border-border'
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        mealType === mt.key ? 'text-primary-foreground' : 'text-foreground'
                      }`}
                    >
                      {mt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View>
                <Text className="mb-1 text-sm text-muted-foreground">음식 설명</Text>
                <TextInput
                  value={mealDesc}
                  onChangeText={setMealDesc}
                  placeholder="예: 비빔밥"
                  placeholderTextColor="#a1a1aa"
                  className="h-12 rounded-xl border border-border px-3 text-base text-foreground"
                />
              </View>
              <View className="flex-row gap-3">
                {field('칼로리', calories, setCalories)}
                {field('단백질 (g)', protein, setProtein)}
              </View>
              <View className="flex-row gap-3">
                {field('탄수화물 (g)', carbs, setCarbs)}
                {field('지방 (g)', fat, setFat)}
              </View>
              <Pressable
                onPress={saveMeal}
                disabled={loading || !mealDesc.trim()}
                className={`h-14 items-center justify-center rounded-xl bg-primary ${
                  loading || !mealDesc.trim() ? 'opacity-50' : ''
                }`}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-lg font-semibold text-primary-foreground">식사 저장</Text>
                )}
              </Pressable>
            </>
          )}

          {tab === 'activity' && (
            <>
              <View className="flex-row flex-wrap gap-2">
                {ACTIVITIES.map((a) => (
                  <Pressable
                    key={a}
                    onPress={() => setActName(a)}
                    className={`rounded-xl border px-3 py-2 ${
                      actName === a ? 'border-primary bg-primary/10' : 'border-border'
                    }`}
                  >
                    <Text className={actName === a ? 'font-bold text-primary' : 'text-foreground'}>
                      {a}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View>
                <Text className="mb-1 text-sm text-muted-foreground">활동명</Text>
                <TextInput
                  value={actName}
                  onChangeText={setActName}
                  placeholder="활동명"
                  placeholderTextColor="#a1a1aa"
                  className="h-12 rounded-xl border border-border px-3 text-base text-foreground"
                />
              </View>
              <View className="flex-row gap-3">
                {field('시간 (분)', actDuration, setActDuration)}
                {field('소모 칼로리', actCalories, setActCalories)}
              </View>
              <Pressable
                onPress={saveActivity}
                disabled={loading || !actName.trim()}
                className={`h-14 items-center justify-center rounded-xl bg-primary ${
                  loading || !actName.trim() ? 'opacity-50' : ''
                }`}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-lg font-semibold text-primary-foreground">활동 저장</Text>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
