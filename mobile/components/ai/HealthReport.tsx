import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';

type Profile = {
  highlights: string[];
  risks: string[];
  watch: string[];
  next_actions: string[];
  summary: string | null;
  updated_at: string;
};

function formatUpdated(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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
  const [report, setReport] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    api
      .getHealthProfile(user.id)
      .then((p) => setReport(p))
      .catch(console.error)
      .finally(() => setLoaded(true));
  }, [user?.id]);

  const generate = async () => {
    if (!user?.id || generating) return;
    if ((profile?.token_balance ?? 0) < 1) {
      Alert.alert('토큰 부족', '리포트 분석에는 토큰 1개가 필요합니다.');
      return;
    }
    setGenerating(true);
    try {
      const data = (await api.generateHealthProfile(user.id)) as Profile;
      setReport(data);
      // The AI call consumes a token; charge after success so a failed
      // generation doesn't cost the user anything.
      api.deductToken(user.id, 1, 'health_report').then(() => fetchProfile(user.id)).catch(() => {});
    } catch (e: any) {
      Alert.alert('분석 실패', e?.message ?? '다시 시도해주세요.');
    } finally {
      setGenerating(false);
    }
  };

  if (!loaded) {
    return (
      <View className="flex-1 items-center justify-center bg-secondary/40">
        <ActivityIndicator color="#16a34a" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerClassName="p-4 gap-4 pb-10">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-foreground">내 건강 리포트</Text>
          {report?.updated_at ? (
            <Text className="mt-1 text-xs text-muted-foreground">
              마지막 분석 · {formatUpdated(report.updated_at)}
            </Text>
          ) : (
            <Text className="mt-1 text-xs text-muted-foreground">
              아직 분석된 리포트가 없습니다
            </Text>
          )}
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
            {report ? '다시 분석' : '분석'}
          </Text>
        </Pressable>
      </View>

      {!report ? (
        <View className="items-center rounded-2xl border border-dashed border-border bg-background py-12">
          <Ionicons name="document-text-outline" size={44} color="#d4d4d8" />
          <Text className="mt-2 text-sm text-muted-foreground">
            분석 버튼을 눌러 첫 리포트를 만들어 보세요
          </Text>
          <Text className="mt-1 text-xs text-muted-foreground">최근 2–4주 데이터 분석 · 토큰 1개</Text>
        </View>
      ) : (
        <>
          {report.summary ? (
            <View className="rounded-2xl bg-background p-4">
              <Text className="text-sm leading-6 text-foreground">{report.summary}</Text>
            </View>
          ) : null}

          <Section
            title="잘 하고 있는 점"
            icon="checkmark-circle"
            color="#16a34a"
            bg="bg-emerald-50"
            items={report.highlights}
          />
          <Section
            title="위험 신호"
            icon="alert-circle"
            color="#ef4444"
            bg="bg-rose-50"
            items={report.risks}
          />
          <Section
            title="주의해서 볼 부분"
            icon="eye"
            color="#f59e0b"
            bg="bg-amber-50"
            items={report.watch}
          />
          <Section
            title="다음에 할 일"
            icon="arrow-forward-circle"
            color="#3b82f6"
            bg="bg-blue-50"
            items={report.next_actions}
          />

          <Text className="mt-2 text-center text-[11px] text-muted-foreground">
            본 리포트는 자가 관리 참고용이며, 의학적 진단·치료를 대체하지 않습니다.
          </Text>
        </>
      )}
    </ScrollView>
  );
}
