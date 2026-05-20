import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Modal,
  Keyboard,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';

type Msg = { role: 'user' | 'ai'; text: string };

type Props = {
  todayEntries: any[];
  dailySummary: { caloriesIn: number; burned: number; protein: number; carbs: number; fat: number };
  onEntriesChanged: () => void;
};

const GREETING: Msg = {
  role: 'ai',
  text: '안녕하세요! 🍽️ 오늘 드신 음식이나 운동을 말씀해주세요. 예: "점심에 김치찌개 먹었어"',
};

const MEAL_KO: Record<string, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};

// A human-readable line for a proposed action, shown in the confirmation card.
function describeAction(a: any, todayStr: string): string {
  const datePrefix = a.entry_date && a.entry_date !== todayStr ? `[${a.entry_date}] ` : '';
  if (a.type === 'add_meal')
    return (
      `${datePrefix}🍽 ${MEAL_KO[a.meal_type] ?? ''} · ${a.description} · ${a.calories}kcal` +
      (a.protein_g ? ` (단백질 ${a.protein_g}g)` : '')
    );
  if (a.type === 'add_activity')
    return `${datePrefix}🏃 ${a.activity_name} · ${a.duration_minutes ?? 0}분 · ${Math.abs(a.calories || 0)}kcal 소모`;
  if (a.type === 'set_goal')
    return (
      `🎯 하루 목표 ${a.daily_calorie_goal}kcal` +
      (a.daily_protein_goal ? ` · 단백질 ${a.daily_protein_goal}g` : '')
    );
  if (a.type === 'delete_entry') return '🗑 기록 삭제';
  return JSON.stringify(a);
}

export function NutriChat({ todayEntries, dailySummary, onEntriesChanged }: Props) {
  const { user, profile, fetchProfile } = useAuthStore();
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<any[] | null>(null);
  const [kbHeight, setKbHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });

  useEffect(() => {
    if (!user?.id) return;
    api
      .getNutritionChat(user.id, todayStr)
      .then((data) => {
        if (data?.messages?.length) setMessages(data.messages);
      })
      .catch(() => {});
  }, [user?.id]);

  // Measure the keyboard so the chat sits exactly above it
  useEffect(() => {
    if (!expanded) {
      setKbHeight(0);
      return;
    }
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s = Keyboard.addListener(showEvt, (e) => setKbHeight(e.endCoordinates?.height ?? 0));
    const h = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      s.remove();
      h.remove();
    };
  }, [expanded]);

  // When the keyboard opens/closes it shrinks the chat panel — snap to the
  // latest message so the user sees the most recent reply, not history.
  useEffect(() => {
    if (expanded) scrollRef.current?.scrollToEnd({ animated: true });
  }, [kbHeight, expanded]);

  const send = async () => {
    if (!input.trim() || !user?.id || loading || pending) return;
    if ((profile?.token_balance ?? 0) < 1) {
      Alert.alert('토큰 부족', '토큰이 부족합니다.');
      return;
    }
    const userMsg = input.trim();
    const next = [...messages, { role: 'user' as const, text: userMsg }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const result = await api.nutritionChat(user.id, userMsg, todayEntries, dailySummary, next);
      const final = [...next, { role: 'ai' as const, text: result.reply || '처리되었습니다.' }];
      setMessages(final);
      api.deductToken(user.id, 1, 'nutrition_chat').then(() => fetchProfile(user.id)).catch(() => {});
      api.saveNutritionChat(user.id, todayStr, final).catch(() => {});
      if (result.pendingActions?.length) setPending(result.pendingActions);
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', text: '오류가 발생했습니다. 다시 시도해주세요.' }]);
    } finally {
      setLoading(false);
    }
  };

  // Apply the proposed actions only after the user taps 확인.
  const confirmPending = async () => {
    if (!pending || !user?.id || loading) return;
    setLoading(true);
    try {
      await api.nutritionApplyActions(user.id, pending);
      onEntriesChanged();
      const done = [...messages, { role: 'ai' as const, text: '✅ 기록했습니다.' }];
      setMessages(done);
      api.saveNutritionChat(user.id, todayStr, done).catch(() => {});
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', text: '저장 중 오류가 발생했습니다.' }]);
    } finally {
      setPending(null);
      setLoading(false);
    }
  };

  const cancelPending = () => {
    setPending(null);
    setMessages((prev) => [...prev, { role: 'ai', text: '기록을 취소했어요.' }]);
  };

  return (
    <>
      {/* Collapsed banner */}
      <Pressable
        onPress={() => setExpanded(true)}
        className="rounded-2xl border border-coral-300 bg-coral-100 p-4"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Ionicons name="sparkles" size={18} color="#A85A45" />
            <Text className="text-sm font-semibold text-foreground">AI 영양사</Text>
            <Text className="text-xs text-muted-foreground">
              · 토큰 {profile?.token_balance ?? 0}개
            </Text>
          </View>
          <Ionicons name="chevron-up" size={18} color="#a1a1aa" />
        </View>
        <Text className="mt-1 text-xs text-muted-foreground" numberOfLines={1}>
          {messages[messages.length - 1]?.text}
        </Text>
      </Pressable>

      {/* Full-screen chat, lifted by the measured keyboard height */}
      <Modal visible={expanded} animationType="slide" onRequestClose={() => setExpanded(false)}>
        <SafeAreaProvider>
          <View className="flex-1 bg-background" style={{ paddingBottom: kbHeight }}>
            <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
            <View className="flex-row items-center justify-between border-b border-border bg-coral-100 p-3">
              <View className="flex-row items-center gap-2">
                <Ionicons name="sparkles" size={20} color="#A85A45" />
                <Text className="text-lg font-bold text-foreground">AI 영양사</Text>
                <Text className="text-xs text-muted-foreground">
                  토큰 {profile?.token_balance ?? 0}개
                </Text>
              </View>
              <Pressable onPress={() => setExpanded(false)}>
                <Ionicons name="close" size={26} color="#71717a" />
              </Pressable>
            </View>

            <ScrollView
              ref={scrollRef}
              className="flex-1"
              contentContainerClassName="p-4 gap-3"
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
            >
              {messages.map((m, i) => (
                <View
                  key={i}
                  className={`flex-row ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <View
                    className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                      m.role === 'user' ? 'bg-primary' : 'bg-secondary'
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        m.role === 'user' ? 'text-primary-foreground' : 'text-foreground'
                      }`}
                    >
                      {m.text}
                    </Text>
                  </View>
                </View>
              ))}
              {loading && <ActivityIndicator size="small" color="#A85A45" />}

              {/* Confirmation card — nothing is logged until the user taps 확인 */}
              {pending && (
                <View className="rounded-2xl border border-coral-300 bg-coral-100 p-3">
                  <Text className="mb-2 text-xs font-semibold text-coral-500">
                    아래 내용을 기록할까요?
                  </Text>
                  {pending.map((a, i) => (
                    <Text key={i} className="mb-1 text-sm text-foreground">
                      {describeAction(a, todayStr)}
                    </Text>
                  ))}
                  <View className="mt-2 flex-row gap-2">
                    <Pressable
                      onPress={confirmPending}
                      disabled={loading}
                      className={`flex-1 items-center justify-center rounded-xl bg-primary py-2.5 ${
                        loading ? 'opacity-50' : ''
                      }`}
                    >
                      <Text className="font-semibold text-primary-foreground">확인</Text>
                    </Pressable>
                    <Pressable
                      onPress={cancelPending}
                      disabled={loading}
                      className="flex-1 items-center justify-center rounded-xl bg-secondary py-2.5"
                    >
                      <Text className="font-semibold text-foreground">취소</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </ScrollView>

            <View className="flex-row items-center gap-2 border-t border-border p-3">
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="예: 점심에 비빔밥 먹었어"
                placeholderTextColor="#a1a1aa"
                multiline
                className="max-h-24 min-h-[44px] flex-1 rounded-xl bg-secondary px-3 py-2 text-base text-foreground"
              />
              <Pressable
                onPress={send}
                disabled={!input.trim() || loading || !!pending}
                className={`h-11 w-11 items-center justify-center rounded-full bg-primary ${
                  !input.trim() || loading || pending ? 'opacity-50' : ''
                }`}
              >
                <Ionicons name="send" size={18} color="#ffffff" />
              </Pressable>
            </View>
            </SafeAreaView>
          </View>
        </SafeAreaProvider>
      </Modal>
    </>
  );
}
