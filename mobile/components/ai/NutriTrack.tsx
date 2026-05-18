import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { NutriChat } from './NutriChat';
import { NutriAddEntry } from './NutriAddEntry';

const KO_DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const TARGET = 2000;

function CalorieRing({ caloriesIn }: { caloriesIn: number }) {
  const r = 50;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, (caloriesIn / TARGET) * 100);
  const offset = c - (pct / 100) * c;
  return (
    <View className="h-32 w-32 items-center justify-center">
      <Svg width={128} height={128} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={64} cy={64} r={r} stroke="#e4e4e7" strokeWidth={9} fill="none" />
        <Circle
          cx={64}
          cy={64}
          r={r}
          stroke="#10b981"
          strokeWidth={9}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </Svg>
      <Text className="text-2xl font-bold text-foreground">{caloriesIn}</Text>
      <Text className="text-[10px] text-muted-foreground">/ {TARGET} kcal</Text>
    </View>
  );
}

export function NutriTrack() {
  const user = useAuthStore((s) => s.user);
  const [entries, setEntries] = useState<any[]>([]);
  const [weekly, setWeekly] = useState<any[]>([]);
  const [showWeekly, setShowWeekly] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCal, setEditCal] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const dateStr = selectedDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
  const isToday = dateStr === todayStr;

  useEffect(() => {
    loadEntries();
  }, [user?.id, dateStr]);
  useEffect(() => {
    if (user?.id) api.getWeeklyNutrition(user.id).then(setWeekly).catch(console.error);
  }, [user?.id]);

  const loadEntries = async () => {
    if (!user?.id) return;
    try {
      setEntries(await api.getNutritionEntries(user.id, dateStr));
    } catch (e) {
      console.error(e);
    }
  };

  const goDate = (offset: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    if (d > new Date()) return;
    setSelectedDate(d);
  };

  const removeEntry = (id: string) => {
    Alert.alert('삭제', '이 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteNutritionEntry(id);
            loadEntries();
          } catch (e) {
            console.error(e);
          }
        },
      },
    ]);
  };

  const saveEdit = async (id: string) => {
    try {
      await api.updateNutritionEntry(id, { calories: Number(editCal) || 0 });
      setEditingId(null);
      loadEntries();
    } catch (e) {
      console.error(e);
    }
  };

  const meals = entries.filter((e) => e.entry_type === 'meal');
  const activities = entries.filter((e) => e.entry_type === 'activity');
  const caloriesIn = meals.reduce((s, e) => s + (e.calories || 0), 0);
  const burned = activities.reduce((s, e) => s + Math.abs(e.calories || 0), 0);
  const protein = meals.reduce((s, e) => s + Number(e.protein_g || 0), 0);
  const carbs = meals.reduce((s, e) => s + Number(e.carbs_g || 0), 0);
  const fat = meals.reduce((s, e) => s + Number(e.fat_g || 0), 0);

  const dateLabel = isToday
    ? '오늘'
    : `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 (${KO_DAYS[selectedDate.getDay()]})`;

  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="p-4 gap-4 pb-8">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-foreground">식단 관리</Text>
          <Pressable
            onPress={() => setShowAdd(true)}
            className="h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg"
          >
            <Ionicons name="add" size={26} color="#fff" />
          </Pressable>
        </View>

        {/* Date nav */}
        <View className="flex-row items-center justify-between rounded-xl bg-background p-2 shadow-sm">
          <Pressable onPress={() => goDate(-1)} className="p-2">
            <Ionicons name="chevron-back" size={20} color="#71717a" />
          </Pressable>
          <Pressable onPress={() => setSelectedDate(new Date())}>
            <Text className="text-base font-semibold text-foreground">{dateLabel}</Text>
          </Pressable>
          <Pressable onPress={() => goDate(1)} disabled={isToday} className="p-2">
            <Ionicons name="chevron-forward" size={20} color={isToday ? '#d4d4d8' : '#71717a'} />
          </Pressable>
        </View>

        {/* Summary */}
        <View className="flex-row items-center gap-5 rounded-2xl bg-emerald-50 p-5">
          <CalorieRing caloriesIn={caloriesIn} />
          <View className="flex-1 gap-2">
            <View className="flex-row justify-between">
              <Text className="text-xs text-muted-foreground">섭취</Text>
              <Text className="text-sm font-bold text-emerald-600">{caloriesIn} kcal</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-muted-foreground">소모</Text>
              <Text className="text-sm font-bold text-orange-500">{burned} kcal</Text>
            </View>
            <View className="flex-row justify-between border-t border-border pt-2">
              <Text className="text-xs font-medium text-foreground">순 칼로리</Text>
              <Text className="text-sm font-bold text-foreground">{caloriesIn - burned} kcal</Text>
            </View>
            <Text className="text-[11px] text-muted-foreground">
              단백질 {protein.toFixed(0)}g · 탄수 {carbs.toFixed(0)}g · 지방 {fat.toFixed(0)}g
            </Text>
          </View>
        </View>

        {/* Weekly */}
        <Pressable
          onPress={() => setShowWeekly((v) => !v)}
          className="flex-row items-center justify-between rounded-xl bg-background p-3 shadow-sm"
        >
          <View className="flex-row items-center gap-2">
            <Ionicons name="trending-up" size={16} color="#16a34a" />
            <Text className="text-sm font-medium text-foreground">주간 기록</Text>
          </View>
          <Ionicons name={showWeekly ? 'chevron-up' : 'chevron-down'} size={16} color="#a1a1aa" />
        </Pressable>
        {showWeekly && weekly.length > 0 && (
          <View className="rounded-2xl bg-background p-4 shadow-sm">
            <View className="h-28 flex-row items-end justify-between gap-1">
              {weekly.map((d, i) => {
                const maxCal = Math.max(...weekly.map((w) => w.caloriesIn || 1), TARGET);
                const h = Math.max(4, (d.caloriesIn / maxCal) * 100);
                const today = d.date === todayStr;
                return (
                  <View key={i} className="flex-1 items-center gap-1">
                    <Text className="text-[9px] text-muted-foreground">{d.caloriesIn || '-'}</Text>
                    <View
                      style={{ height: `${h}%` }}
                      className={`w-5 rounded-t ${today ? 'bg-emerald-500' : 'bg-emerald-300'}`}
                    />
                    <Text className="text-[10px] text-muted-foreground">
                      {KO_DAYS[new Date(d.date).getDay()]}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Entries */}
        <Text className="text-base font-semibold text-foreground">
          {isToday ? '오늘의 기록' : '기록'}
        </Text>
        {entries.length === 0 ? (
          <View className="items-center rounded-2xl border border-dashed border-border bg-background py-10">
            <Ionicons name="restaurant-outline" size={36} color="#d4d4d8" />
            <Text className="mt-2 text-sm text-muted-foreground">아직 기록이 없습니다</Text>
          </View>
        ) : (
          entries.map((entry) => (
            <View
              key={entry.id}
              className="flex-row items-center gap-3 rounded-xl bg-background p-3 shadow-sm"
            >
              <View
                className={`h-10 w-10 items-center justify-center rounded-xl ${
                  entry.entry_type === 'meal' ? 'bg-emerald-100' : 'bg-orange-100'
                }`}
              >
                <Ionicons
                  name={entry.entry_type === 'meal' ? 'restaurant' : 'barbell'}
                  size={18}
                  color={entry.entry_type === 'meal' ? '#16a34a' : '#f97316'}
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                  {entry.description || entry.activity_name || '기록'}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {entry.entry_type === 'activity' && entry.duration_minutes
                    ? `${entry.duration_minutes}분`
                    : ''}
                </Text>
              </View>
              {editingId === entry.id ? (
                <View className="flex-row items-center gap-1">
                  <TextInput
                    value={editCal}
                    onChangeText={setEditCal}
                    keyboardType="numeric"
                    autoFocus
                    className="h-8 w-16 rounded border border-border px-1 text-right text-sm text-foreground"
                  />
                  <Pressable onPress={() => saveEdit(entry.id)}>
                    <Ionicons name="checkmark" size={20} color="#16a34a" />
                  </Pressable>
                </View>
              ) : (
                <View className="flex-row items-center gap-2">
                  <Text
                    className={`text-sm font-bold ${
                      entry.entry_type === 'activity' ? 'text-orange-500' : 'text-emerald-600'
                    }`}
                  >
                    {entry.entry_type === 'activity' ? '-' : ''}
                    {Math.abs(entry.calories)} kcal
                  </Text>
                  <Pressable
                    onPress={() => {
                      setEditingId(entry.id);
                      setEditCal(String(Math.abs(entry.calories)));
                    }}
                  >
                    <Ionicons name="pencil" size={14} color="#a1a1aa" />
                  </Pressable>
                  <Pressable onPress={() => removeEntry(entry.id)}>
                    <Ionicons name="trash-outline" size={14} color="#ef4444" />
                  </Pressable>
                </View>
              )}
            </View>
          ))
        )}

        {isToday && (
          <NutriChat
            todayEntries={entries}
            dailySummary={{ caloriesIn, burned, protein, carbs, fat }}
            onEntriesChanged={loadEntries}
          />
        )}
      </ScrollView>

      <NutriAddEntry
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdded={loadEntries}
        dateStr={dateStr}
      />
    </View>
  );
}
