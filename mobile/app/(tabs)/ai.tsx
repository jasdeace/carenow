import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/authStore';
import { NutriTrack } from '@/components/ai/NutriTrack';
import { LabResults } from '@/components/ai/LabResults';
import { HealthReport } from '@/components/ai/HealthReport';

type Tab = 'nutrition' | 'labs' | 'report';

export default function AIHub() {
  const { profile } = useAuthStore();
  const [tab, setTab] = useState<Tab>('nutrition');

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-secondary">
      {/* Header */}
      <View className="flex-row items-center justify-between bg-background px-4 pt-3">
        <View className="flex-row items-center gap-2">
          <Ionicons name="sparkles" size={22} color="#16a34a" />
          <Text className="text-xl font-bold text-primary">AI</Text>
        </View>
        <View className="flex-row items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5">
          <Ionicons name="sparkles" size={13} color="#8b5cf6" />
          <Text className="text-sm font-semibold text-violet-600">
            {profile?.token_balance ?? 0}
          </Text>
          <Text className="text-xs text-violet-400">토큰</Text>
        </View>
      </View>

      {/* Tabs */}
      <View className="bg-background px-4 pb-3 pt-2">
        <View className="flex-row rounded-xl bg-secondary p-1">
          {(
            [
              { key: 'nutrition', label: '식단 관리' },
              { key: 'labs', label: '검사결과' },
              { key: 'report', label: '리포트' },
            ] as const
          ).map((tabItem) => {
            const active = tab === tabItem.key;
            return (
              <Pressable
                key={tabItem.key}
                onPress={() => setTab(tabItem.key)}
                className={`flex-1 items-center rounded-lg py-2 ${active ? 'bg-background shadow-sm' : ''}`}
              >
                <Text
                  className={`text-base font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  {tabItem.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {tab === 'nutrition' ? <NutriTrack /> : tab === 'labs' ? <LabResults /> : <HealthReport />}
    </SafeAreaView>
  );
}
