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

export function NutriChat({ todayEntries, dailySummary, onEntriesChanged }: Props) {
  const { user, profile, fetchProfile } = useAuthStore();
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [loading, setLoading] = useState(false);
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

  const send = async () => {
    if (!input.trim() || !user?.id || loading) return;
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
      if (result.actions?.length > 0) onEntriesChanged();
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', text: '오류가 발생했습니다. 다시 시도해주세요.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Collapsed banner */}
      <Pressable
        onPress={() => setExpanded(true)}
        className="rounded-2xl border border-violet-200 bg-violet-50 p-4"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Ionicons name="sparkles" size={18} color="#8b5cf6" />
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
            <View className="flex-row items-center justify-between border-b border-border bg-violet-50 p-3">
              <View className="flex-row items-center gap-2">
                <Ionicons name="sparkles" size={20} color="#8b5cf6" />
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
              {loading && <ActivityIndicator size="small" color="#8b5cf6" />}
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
                disabled={!input.trim() || loading}
                className={`h-11 w-11 items-center justify-center rounded-full bg-primary ${
                  !input.trim() || loading ? 'opacity-50' : ''
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
