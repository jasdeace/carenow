import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/authStore';
import { api, type HealthReport as Report } from '@/lib/api';

type Msg = { role: 'user' | 'ai'; text: string };

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Section({
  title,
  icon,
  color,
  bg,
  items,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  items: string[];
}) {
  if (!items?.length) return null;
  return (
    <View className={`rounded-2xl p-4 ${bg}`}>
      <View className="mb-2 flex-row items-center gap-2">
        <Ionicons name={icon} size={18} color={color} />
        <Text className="text-base font-bold text-foreground">{title}</Text>
      </View>
      {items.map((item, i) => (
        <View key={i} className="flex-row gap-2 py-1">
          <Text className="text-sm text-muted-foreground">•</Text>
          <Text className="flex-1 text-sm leading-6 text-foreground">{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function HealthReport() {
  const { user, profile, fetchProfile } = useAuthStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Chat-modal state — scoped to whichever report the user opened
  const [chatReport, setChatReport] = useState<Report | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Msg[]>([]);
  const [chatting, setChatting] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);
  const chatScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!user?.id) return;
    api
      .getHealthProfileHistory(user.id)
      .then((rows) => {
        setReports(rows);
        if (rows.length > 0) setExpandedId(rows[0].id);
      })
      .catch(console.error)
      .finally(() => setLoaded(true));
  }, [user?.id]);

  // Keyboard height — only while the chat modal is open
  useEffect(() => {
    if (!chatReport) {
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
  }, [chatReport]);

  // Snap to latest message when keyboard opens (after panel resizes)
  useEffect(() => {
    if (chatReport) chatScrollRef.current?.scrollToEnd({ animated: true });
  }, [kbHeight, chatReport]);

  const generate = async () => {
    if (!user?.id || generating) return;
    if ((profile?.token_balance ?? 0) < 1) {
      Alert.alert('토큰 부족', '리포트 분석에는 토큰 1개가 필요합니다.');
      return;
    }
    setGenerating(true);
    try {
      const fresh = (await api.generateHealthProfile(user.id)) as Report;
      setReports((prev) => [fresh, ...prev]);
      setExpandedId(fresh.id);
      api.deductToken(user.id, 1, 'health_report').then(() => fetchProfile(user.id)).catch(() => {});
    } catch (e: any) {
      Alert.alert('분석 실패', e?.message ?? '다시 시도해주세요.');
    } finally {
      setGenerating(false);
    }
  };

  const openChat = (r: Report) => {
    setChatReport(r);
    setChatHistory(Array.isArray(r.chat_history) ? r.chat_history : []);
    setChatInput('');
  };

  const sendChat = async () => {
    if (!chatReport || !user?.id || !chatInput.trim() || chatting) return;
    if ((profile?.token_balance ?? 0) < 1) {
      Alert.alert('토큰 부족', '리포트 채팅에는 토큰 1개가 필요합니다.');
      return;
    }
    const text = chatInput.trim();
    const next: Msg[] = [...chatHistory, { role: 'user', text }];
    setChatHistory(next);
    setChatInput('');
    setChatting(true);
    try {
      const res = await api.chatHealthReport(user.id, chatReport.id, text, next);
      setChatHistory(res.chat_history);
      // Keep the in-memory list in sync so the dialog count + persisted
      // history stay correct without a full reload.
      setReports((prev) =>
        prev.map((r) => (r.id === chatReport.id ? { ...r, chat_history: res.chat_history } : r)),
      );
      api
        .deductToken(user.id, 1, 'health_report_chat')
        .then(() => fetchProfile(user.id))
        .catch(() => {});
    } catch {
      setChatHistory((prev) => [...prev, { role: 'ai', text: '오류가 발생했습니다. 다시 시도해주세요.' }]);
    } finally {
      setChatting(false);
    }
  };

  if (!loaded) {
    return (
      <View className="flex-1 items-center justify-center bg-secondary/40">
        <ActivityIndicator color="#0F766E" />
      </View>
    );
  }

  return (
    <>
      <ScrollView contentContainerClassName="p-4 gap-3 pb-10">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-2xl font-bold text-foreground">내 건강 리포트</Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              {reports.length > 0 ? `리포트 ${reports.length}개 · 최신 우선` : '아직 분석된 리포트가 없습니다'}
            </Text>
          </View>
          <Pressable
            onPress={generate}
            disabled={generating}
            className={`h-11 flex-row items-center gap-1.5 rounded-full bg-primary px-4 ${
              generating ? 'opacity-50' : ''
            }`}
          >
            {generating ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Ionicons name="sparkles" size={16} color="#ffffff" />
            )}
            <Text className="text-sm font-semibold text-primary-foreground">
              {reports.length > 0 ? '새 분석' : '분석'}
            </Text>
          </Pressable>
        </View>

        {reports.length === 0 ? (
          <View className="items-center rounded-2xl border border-dashed border-border bg-background py-12">
            <Ionicons name="document-text-outline" size={44} color="#d4d4d8" />
            <Text className="mt-2 text-sm text-muted-foreground">
              분석 버튼을 눌러 첫 리포트를 만들어 보세요
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              최근 2–4주 데이터 분석 · 토큰 1개
            </Text>
          </View>
        ) : (
          reports.map((r) => {
            const open = expandedId === r.id;
            const turns = Array.isArray(r.chat_history) ? Math.floor(r.chat_history.length / 2) : 0;
            return (
              <View key={r.id} className="overflow-hidden rounded-2xl bg-background">
                <Pressable
                  onPress={() => setExpandedId(open ? null : r.id)}
                  className="flex-row items-center justify-between p-4"
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-base font-semibold text-foreground">
                      {formatDate(r.generated_at)}
                    </Text>
                    {r.summary ? (
                      <Text
                        className="mt-0.5 text-xs text-muted-foreground"
                        numberOfLines={open ? 0 : 2}
                      >
                        {r.summary}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#a1a1aa" />
                </Pressable>

                {open && (
                  <View className="gap-3 px-4 pb-4">
                    <Section
                      title="잘 하고 있는 점"
                      icon="checkmark-circle"
                      color="#0F766E"
                      bg="bg-teal-50"
                      items={r.highlights}
                    />
                    <Section
                      title="위험 신호"
                      icon="alert-circle"
                      color="#ef4444"
                      bg="bg-rose-50"
                      items={r.risks}
                    />
                    <Section
                      title="주의해서 볼 부분"
                      icon="eye"
                      color="#f59e0b"
                      bg="bg-amber-50"
                      items={r.watch}
                    />
                    <Section
                      title="다음에 할 일"
                      icon="arrow-forward-circle"
                      color="#3b82f6"
                      bg="bg-blue-50"
                      items={r.next_actions}
                    />

                    <Pressable
                      onPress={() => openChat(r)}
                      className="flex-row items-center justify-center gap-2 rounded-xl bg-secondary py-3"
                    >
                      <Ionicons name="chatbubble-ellipses" size={16} color="#0F766E" />
                      <Text className="text-sm font-medium text-foreground">
                        이 리포트에 대해 질문하기
                        {turns > 0 ? ` · ${turns}개 대화` : ''}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })
        )}

        {reports.length > 0 && (
          <Text className="mt-2 text-center text-[11px] text-muted-foreground">
            본 리포트는 자가 관리 참고용이며, 의학적 진단·치료를 대체하지 않습니다.
          </Text>
        )}
      </ScrollView>

      {/* Per-report chat — full-screen Modal lifted by the measured keyboard */}
      <Modal visible={!!chatReport} animationType="slide" onRequestClose={() => setChatReport(null)}>
        <SafeAreaProvider>
          <View className="flex-1 bg-background" style={{ paddingBottom: kbHeight }}>
            <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
              <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
                <View className="flex-1 pr-3">
                  <Text className="text-lg font-bold text-foreground" numberOfLines={1}>
                    리포트 Q&A
                  </Text>
                  {chatReport ? (
                    <Text className="text-[11px] text-muted-foreground">
                      {formatDate(chatReport.generated_at)}
                    </Text>
                  ) : null}
                </View>
                <Pressable onPress={() => setChatReport(null)}>
                  <Ionicons name="close" size={26} color="#71717a" />
                </Pressable>
              </View>

              <ScrollView
                ref={chatScrollRef}
                className="flex-1"
                contentContainerClassName="p-4 gap-3"
                onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="none"
              >
                {chatHistory.length === 0 ? (
                  <View className="items-center py-6">
                    <Text className="text-sm text-muted-foreground">
                      이 리포트에 대해 무엇이든 물어보세요.
                    </Text>
                    <Text className="mt-1 text-xs text-muted-foreground">
                      예: "혈압이 왜 높은가요?", "단백질 어떻게 늘릴까요?"
                    </Text>
                  </View>
                ) : (
                  chatHistory.map((m, i) => (
                    <View
                      key={i}
                      className={`flex-row ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <View
                        className={`max-w-[85%] rounded-2xl p-3 ${
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
                  ))
                )}
                {chatting && <ActivityIndicator size="small" color="#0F766E" />}
              </ScrollView>

              <View className="flex-row items-center gap-2 border-t border-border p-3">
                <TextInput
                  value={chatInput}
                  onChangeText={setChatInput}
                  placeholder="질문을 입력하세요..."
                  placeholderTextColor="#a1a1aa"
                  multiline
                  className="max-h-24 min-h-[44px] flex-1 rounded-xl bg-secondary px-3 py-2 text-base text-foreground"
                />
                <Pressable
                  onPress={sendChat}
                  disabled={!chatInput.trim() || chatting}
                  className={`h-11 w-11 items-center justify-center rounded-full bg-primary ${
                    !chatInput.trim() || chatting ? 'opacity-50' : ''
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
