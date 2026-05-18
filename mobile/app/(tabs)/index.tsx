import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/authStore';

function greeting(name: string) {
  const h = new Date().getHours();
  const part = h < 12 ? '좋은 아침이에요' : h < 18 ? '안녕하세요' : '좋은 저녁이에요';
  return `${part}, ${name}님`;
}

export default function Home() {
  const { profile } = useAuthStore();
  const [checkedIn, setCheckedIn] = useState(false);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-secondary">
      {/* Brand bar */}
      <View className="flex-row items-center justify-center gap-2 bg-background py-3">
        <View className="h-7 w-7 items-center justify-center rounded-lg bg-primary">
          <Text className="font-extrabold text-primary-foreground">C</Text>
        </View>
        <Text className="text-lg font-bold text-primary">CareLink</Text>
      </View>

      <ScrollView contentContainerClassName="p-4 gap-4">
        {/* Greeting */}
        <Text className="text-lg font-bold text-foreground">
          {greeting(profile?.name_ko || 'User')}
        </Text>

        {/* Daily check-in */}
        <Pressable
          onPress={() => setCheckedIn(true)}
          disabled={checkedIn}
          className={`h-12 items-center justify-center rounded-xl ${
            checkedIn ? 'bg-secondary' : 'bg-primary'
          }`}
        >
          <Text
            className={`text-base font-semibold ${
              checkedIn ? 'text-muted-foreground' : 'text-primary-foreground'
            }`}
          >
            {checkedIn ? '괜찮아요 ✓' : '오늘 괜찮아요 😊'}
          </Text>
        </Pressable>

        {/* Meds card */}
        <View className="rounded-2xl bg-background p-4 shadow-sm">
          <View className="mb-2 flex-row items-center gap-2">
            <Ionicons name="medkit" size={20} color="#16a34a" />
            <Text className="text-lg font-bold text-foreground">오늘의 약</Text>
          </View>
          <Text className="text-sm text-muted-foreground">
            복용 기록이 곧 여기에 표시됩니다.
          </Text>
        </View>

        {/* Vitals card */}
        <View className="rounded-2xl bg-background p-4 shadow-sm">
          <View className="mb-2 flex-row items-center gap-2">
            <Ionicons name="pulse" size={20} color="#ef4444" />
            <Text className="text-lg font-bold text-foreground">건강수치</Text>
          </View>
          <Text className="text-sm text-muted-foreground">
            혈압·혈당 기록이 곧 여기에 표시됩니다.
          </Text>
        </View>

        <Text className="mt-2 text-center text-xs text-muted-foreground">
          React Native 마이그레이션 · Phase 0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
