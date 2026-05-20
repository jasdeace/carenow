import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useAuthStore } from '@/stores/authStore';
import { NutriTrack } from '@/components/ai/NutriTrack';
import { LabResults } from '@/components/ai/LabResults';
import { HealthReport } from '@/components/ai/HealthReport';
import { COLORS } from '@/constants/design';

type Tab = 'nutrition' | 'labs' | 'report';

function SparkIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <Path
        d="M19 15l.7 1.8L21.5 17.5l-1.8.7L19 20l-.7-1.8L16.5 17.5l1.8-.7L19 15z"
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function AIHub() {
  const { profile } = useAuthStore();
  const [tab, setTab] = useState<Tab>('nutrition');

  const TABS: { key: Tab; label: string }[] = [
    { key: 'nutrition', label: '식단 관리' },
    { key: 'labs', label: '검사결과' },
    { key: 'report', label: '리포트' },
  ];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: COLORS.cream[50] }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 4,
          paddingBottom: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: COLORS.teal[100],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SparkIcon color={COLORS.teal[700]} size={20} />
          </View>
          <Text
            style={{
              fontSize: 22,
              fontWeight: '700',
              color: COLORS.ink[900],
              letterSpacing: -0.4,
            }}
          >
            AI 건강 도우미
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 9999,
            backgroundColor: COLORS.coral[100],
          }}
        >
          <SparkIcon color="#A85A45" size={13} />
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#A85A45' }}>
            {profile?.token_balance ?? 0}
          </Text>
          <Text style={{ fontSize: 11, color: '#A85A45', opacity: 0.7 }}>토큰</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: COLORS.cream[100],
            padding: 4,
            borderRadius: 14,
          }}
        >
          {TABS.map((tabItem) => {
            const active = tab === tabItem.key;
            return (
              <Pressable
                key={tabItem.key}
                onPress={() => setTab(tabItem.key)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 8,
                  borderRadius: 11,
                  backgroundColor: active ? COLORS.paper : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 13.5,
                    fontWeight: active ? '600' : '500',
                    color: active ? COLORS.teal[700] : COLORS.ink[500],
                  }}
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
