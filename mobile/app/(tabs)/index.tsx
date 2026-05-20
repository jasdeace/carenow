import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';

import { TakerHome } from '@/components/home/TakerHome';
import { GiverHome } from '@/components/home/GiverHome';
import { useAuthStore } from '@/stores/authStore';
import { COLORS } from '@/constants/design';

const TABS = [
  { key: 'taker', labelKey: 'home.taker_tab' },
  { key: 'giver', labelKey: 'home.giver_tab' },
] as const;

export default function Home() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [tab, setTab] = useState<'taker' | 'giver'>('taker');
  const initial = (profile?.name_ko || profile?.email || '?').trim().charAt(0);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: COLORS.cream[50] }}>
      {/* Top action row — bell + avatar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 8,
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 4,
        }}
      >
        <Pressable
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: COLORS.paper,
            borderWidth: 1,
            borderColor: COLORS.lineSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityLabel="알림"
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16z"
              stroke={COLORS.ink[700]}
              strokeWidth={1.6}
              strokeLinejoin="round"
            />
            <Path
              d="M10 21a2 2 0 0 0 4 0"
              stroke={COLORS.ink[700]}
              strokeWidth={1.6}
              strokeLinecap="round"
            />
          </Svg>
        </Pressable>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: COLORS.teal[100],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: COLORS.teal[800], fontWeight: '600', fontSize: 13 }}>
            {initial}
          </Text>
        </View>
      </View>

      {/* Taker / Giver segmented */}
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: COLORS.cream[100],
            borderRadius: 14,
            padding: 4,
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
                    fontSize: 14,
                    fontWeight: active ? '600' : '500',
                    color: active ? COLORS.teal[700] : COLORS.ink[500],
                  }}
                >
                  {t(tabItem.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'taker' ? <TakerHome /> : <GiverHome />}
      </ScrollView>
    </SafeAreaView>
  );
}
