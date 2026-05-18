import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { TakerHome } from '@/components/home/TakerHome';
import { GiverHome } from '@/components/home/GiverHome';

const TABS = [
  { key: 'taker', labelKey: 'home.taker_tab' },
  { key: 'giver', labelKey: 'home.giver_tab' },
] as const;

export default function Home() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'taker' | 'giver'>('taker');

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-secondary">
      {/* Brand bar */}
      <View className="flex-row items-center justify-center gap-2 bg-background pt-3">
        <View className="h-7 w-7 items-center justify-center rounded-lg bg-primary">
          <Text className="font-extrabold text-primary-foreground">C</Text>
        </View>
        <Text className="text-lg font-bold text-primary">CareLink</Text>
      </View>

      {/* Tabs */}
      <View className="bg-background px-4 pb-3 pt-2">
        <View className="flex-row rounded-xl bg-secondary p-1">
          {TABS.map((tabItem) => {
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
                  {t(tabItem.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerClassName="p-4 pb-8">
        {tab === 'taker' ? <TakerHome /> : <GiverHome />}
      </ScrollView>
    </SafeAreaView>
  );
}
