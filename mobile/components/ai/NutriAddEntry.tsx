import { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Modal, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';

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
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<'manual' | 'activity'>('manual');
  const [loading, setLoading] = useState(false);

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
    setMealDesc('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setActName('');
    setActDuration('');
    setActCalories('');
    setTab('manual');
  };

  const close = () => {
    reset();
    onClose();
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

  const field = (label: string, value: string, set: (v: string) => void, numeric = true) => (
    <View className="flex-1">
      <Text className="mb-1 text-sm text-muted-foreground">{label}</Text>
      <TextInput
        value={value}
        onChangeText={set}
        keyboardType={numeric ? 'numeric' : 'default'}
        className="h-12 rounded-xl border border-border px-3 text-base text-foreground"
      />
    </View>
  );

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <Text className="text-lg font-bold text-foreground">기록 추가</Text>
          <Pressable onPress={close}>
            <Ionicons name="close" size={26} color="#71717a" />
          </Pressable>
        </View>

        <View className="flex-row gap-1 bg-secondary p-1" style={{ margin: 16, borderRadius: 12 }}>
          {(['manual', 'activity'] as const).map((tk) => (
            <Pressable
              key={tk}
              onPress={() => setTab(tk)}
              className={`flex-1 items-center rounded-lg py-2.5 ${tab === tk ? 'bg-background shadow-sm' : ''}`}
            >
              <Text className={tab === tk ? 'font-semibold text-primary' : 'text-muted-foreground'}>
                {tk === 'manual' ? '✍️ 식사' : '🏃 활동'}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView contentContainerClassName="px-4 pb-8 gap-4" keyboardShouldPersistTaps="handled">
          {tab === 'manual' ? (
            <>
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
                  placeholder="예: 비빔밥, 된장찌개"
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
          ) : (
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
          <Text className="text-center text-xs text-muted-foreground">
            📷 AI 사진 분석은 Phase 3에서 추가됩니다
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
