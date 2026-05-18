import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { pickImage } from '@/lib/camera';
import { processImageOCR } from '@/lib/ocr';

type Msg = { role: 'user' | 'ai'; text: string };

function normalizeMetrics(raw: any): Record<string, string> | null {
  if (!raw) return null;
  if (typeof raw === 'string') return { Result: raw };
  const res: Record<string, string> = {};
  const process = (key: string, val: any) => {
    if (val === null || val === undefined) return;
    if (typeof val === 'object' && !Array.isArray(val)) {
      if (val.value !== undefined) {
        res[key] = String(val.value) + (val.unit ? ` ${val.unit}` : '');
      } else {
        Object.entries(val).forEach(([k, v]) => process(k, v));
      }
    } else if (Array.isArray(val)) {
      val.forEach((item, idx) => {
        if (typeof item === 'object') {
          res[item.metricName || item.name || `${key}_${idx}`] =
            item.value !== undefined ? String(item.value) : JSON.stringify(item);
        } else {
          res[`${key}_${idx}`] = String(item);
        }
      });
    } else {
      res[key] = String(val);
    }
  };
  if (typeof raw === 'object') Object.entries(raw).forEach(([k, v]) => process(k, v));
  return Object.keys(res).length > 0 ? res : null;
}

function metricsOf(parsed: any): Record<string, string> | null {
  let m = normalizeMetrics(parsed?.metrics);
  if (!m && parsed) {
    m = normalizeMetrics(parsed);
    if (m) {
      for (const k of ['type', 'reportDate', 'medicationName', 'rawTextSummary', 'dosageAmount', 'dosageUnit'])
        delete m[k];
      if (Object.keys(m).length === 0) m = null;
    }
  }
  return m;
}

const isAbnormal = (v: string) => / H$| L$| H | L /.test(v);

export function LabResults() {
  const { user, profile, fetchProfile } = useAuthStore();
  const [labs, setLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [chatLab, setChatLab] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<Msg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatting, setChatting] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [scanned, setScanned] = useState<any>(null);
  const [labDate, setLabDate] = useState('');

  const scanLab = async () => {
    const b64 = await pickImage('camera', { quality: 0.85 });
    if (!b64) return;
    setOcrLoading(true);
    try {
      const result = await processImageOCR([b64]);
      setScanned(result.parsedData ?? { rawTextSummary: result.rawText });
      const d = result.parsedData?.reportDate;
      setLabDate(d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : new Date().toISOString().split('T')[0]);
    } catch (e: any) {
      Alert.alert('인식 실패', e?.message || '다시 시도해주세요');
    } finally {
      setOcrLoading(false);
    }
  };

  const saveLab = async () => {
    if (!user?.id || !scanned) return;
    try {
      await api.saveLabResult(user.id, labDate, JSON.stringify(scanned), scanned);
      setUploadOpen(false);
      setScanned(null);
      setLabDate('');
      load();
    } catch (e: any) {
      Alert.alert('저장 실패', e?.message || '');
    }
  };

  useEffect(() => {
    if (user?.id) load();
  }, [user?.id]);

  const load = async () => {
    if (!user?.id) return;
    try {
      const data = await api.getLabResults(user.id);
      setLabs(
        data.map((d: any) => ({
          id: d.id,
          date: d.recorded_at,
          content: d.raw_content,
          parsedData: d.parsed_data,
          chat_history: d.chat_history,
        })),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const removeLab = (id: string) => {
    Alert.alert('삭제', '정말 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteLabResult(id);
            load();
          } catch (e) {
            console.error(e);
          }
        },
      },
    ]);
  };

  const openChat = (lab: any) => {
    setChatLab(lab);
    setChatHistory(
      lab.chat_history || [
        { role: 'ai', text: '무엇이든 물어보세요! 이 검사 결과에 대해 설명해드릴 수 있습니다.' },
      ],
    );
  };

  const askAI = async () => {
    if (!chatInput.trim() || !chatLab || !user?.id) return;
    if (profile?.tier !== 'premium' && (profile?.token_balance ?? 0) < 1) {
      Alert.alert('토큰 부족', '프로필에서 토큰을 충전해주세요.');
      return;
    }
    const userMsg = chatInput;
    const next: Msg[] = [...chatHistory, { role: 'user', text: userMsg }];
    setChatHistory(next);
    setChatInput('');
    setChatting(true);
    try {
      const reply = await api.askAI(userMsg, chatLab.parsedData || chatLab.content, next);
      const final: Msg[] = [...next, { role: 'ai', text: reply }];
      setChatHistory(final);
      api.deductToken(user.id, 1, 'lab_consultation').then(() => fetchProfile(user.id)).catch(() => {});
      setLabs((prev) => prev.map((l) => (l.id === chatLab.id ? { ...l, chat_history: final } : l)));
      api.updateLabResultChat(chatLab.id, final).catch((e) => console.error(e));
    } catch (e) {
      console.error(e);
      setChatHistory((prev) => [...prev, { role: 'ai', text: '오류가 발생했습니다. 다시 시도해주세요.' }]);
    } finally {
      setChatting(false);
    }
  };

  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="p-4 gap-3 pb-8">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-foreground">검사결과</Text>
          <Pressable
            onPress={() => {
              setScanned(null);
              setUploadOpen(true);
            }}
            className="h-11 w-11 items-center justify-center rounded-full bg-primary shadow-lg"
          >
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color="#16a34a" className="mt-12" />
        ) : labs.length === 0 ? (
          <View className="mt-6 items-center rounded-2xl border border-dashed border-border bg-background py-12">
            <Ionicons name="document-text-outline" size={44} color="#d4d4d8" />
            <Text className="mt-2 text-sm text-muted-foreground">저장된 검사결과가 없습니다</Text>
            <Text className="mt-1 text-xs text-muted-foreground">+ 버튼으로 검사지를 스캔하세요</Text>
          </View>
        ) : (
          labs.map((lab) => {
            const metrics = metricsOf(lab.parsedData);
            const isOpen = expanded.has(lab.id);
            return (
              <View key={lab.id} className="overflow-hidden rounded-2xl bg-background shadow-sm">
                <View className="flex-row items-center justify-between bg-secondary px-3 py-2.5">
                  <Pressable onPress={() => toggle(lab.id)} className="flex-1 flex-row items-center gap-2">
                    <Ionicons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#16a34a"
                    />
                    <Text className="text-base font-semibold text-foreground">{lab.date}</Text>
                  </Pressable>
                  <Pressable onPress={() => openChat(lab)} className="p-1.5">
                    <Ionicons name="chatbubble-ellipses" size={20} color="#16a34a" />
                  </Pressable>
                  <Pressable onPress={() => removeLab(lab.id)} className="p-1.5">
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </Pressable>
                </View>
                {metrics ? (
                  isOpen ? (
                    <View>
                      {Object.entries(metrics).map(([k, v]) => (
                        <View
                          key={k}
                          className="flex-row justify-between border-b border-border/50 px-4 py-2.5"
                        >
                          <Text className="text-sm font-medium text-foreground">{k}</Text>
                          <Text
                            className={`text-sm ${
                              isAbnormal(String(v))
                                ? 'font-bold text-destructive'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {String(v)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Pressable onPress={() => toggle(lab.id)} className="flex-row flex-wrap gap-2 p-3">
                      {Object.keys(metrics)
                        .slice(0, 3)
                        .map((k) => (
                          <View key={k} className="rounded border border-border px-2 py-0.5">
                            <Text className="text-[11px] font-medium text-foreground">{k}</Text>
                          </View>
                        ))}
                      {Object.keys(metrics).length > 3 && (
                        <Text className="text-[11px] text-muted-foreground">
                          외 {Object.keys(metrics).length - 3}건
                        </Text>
                      )}
                    </Pressable>
                  )
                ) : (
                  <Text className="p-4 text-sm text-muted-foreground" numberOfLines={isOpen ? 0 : 3}>
                    {lab.content}
                  </Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Lab chat — in-app overlay so KeyboardAvoidingView measures correctly */}
      {!!chatLab && (
        <View style={[StyleSheet.absoluteFillObject, { zIndex: 50 }]} className="bg-background">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <SafeAreaView className="flex-1 bg-background">
            <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
              <View className="flex-row items-center gap-2">
                <Ionicons name="chatbubble-ellipses" size={20} color="#16a34a" />
                <Text className="text-lg font-bold text-foreground">AI 검사결과 분석</Text>
              </View>
              <Pressable onPress={() => setChatLab(null)}>
                <Ionicons name="close" size={26} color="#71717a" />
              </Pressable>
            </View>

            <ScrollView className="flex-1" contentContainerClassName="p-4 gap-3">
              {chatHistory.map((m, i) => (
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
              ))}
              {chatting && <ActivityIndicator size="small" color="#16a34a" />}
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
                onPress={askAI}
                disabled={!chatInput.trim() || chatting}
                className={`h-11 w-11 items-center justify-center rounded-full bg-primary ${
                  !chatInput.trim() || chatting ? 'opacity-50' : ''
                }`}
              >
                <Ionicons name="send" size={18} color="#ffffff" />
              </Pressable>
            </View>
          </SafeAreaView>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* Upload / scan — in-app overlay (not RN Modal: camera conflicts with it) */}
      {uploadOpen && (
        <View style={[StyleSheet.absoluteFillObject, { zIndex: 50 }]}>
          <SafeAreaView className="flex-1 bg-background">
          <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
            <Text className="text-lg font-bold text-foreground">검사결과 추가</Text>
            <Pressable onPress={() => setUploadOpen(false)}>
              <Ionicons name="close" size={26} color="#71717a" />
            </Pressable>
          </View>
          <ScrollView contentContainerClassName="p-4 gap-4">
            {ocrLoading ? (
              <View className="items-center gap-3 py-12">
                <ActivityIndicator size="large" color="#16a34a" />
                <Text className="text-primary">검사지를 분석하고 있습니다...</Text>
              </View>
            ) : !scanned ? (
              <Pressable
                onPress={scanLab}
                className="h-32 items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary/5"
              >
                <Ionicons name="camera" size={36} color="#16a34a" />
                <Text className="text-base font-medium text-primary">검사지 촬영</Text>
              </Pressable>
            ) : (
              <>
                <View>
                  <Text className="mb-1 text-sm text-muted-foreground">검사일자</Text>
                  <TextInput
                    value={labDate}
                    onChangeText={setLabDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#a1a1aa"
                    className="h-12 rounded-xl border border-border px-3 text-base text-foreground"
                  />
                </View>
                {(() => {
                  const m = metricsOf(scanned);
                  return m ? (
                    <View className="overflow-hidden rounded-xl border border-border">
                      {Object.entries(m).map(([k, v]) => (
                        <View
                          key={k}
                          className="flex-row justify-between border-b border-border/50 px-4 py-2.5"
                        >
                          <Text className="text-sm font-medium text-foreground">{k}</Text>
                          <Text
                            className={`text-sm ${
                              isAbnormal(String(v))
                                ? 'font-bold text-destructive'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {String(v)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text className="text-sm text-muted-foreground">
                      {scanned.rawTextSummary || JSON.stringify(scanned)}
                    </Text>
                  );
                })()}
                <Pressable
                  onPress={saveLab}
                  className="h-14 items-center justify-center rounded-xl bg-primary"
                >
                  <Text className="text-lg font-semibold text-primary-foreground">저장</Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
        </View>
      )}
    </View>
  );
}
