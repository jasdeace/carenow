import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export type LegalSection = { heading?: string; body: string[] };

// Shared chrome for the privacy / terms / sensitive-info documents.
export function LegalDoc({
  title,
  sections,
  updated,
}: {
  title: string;
  sections: LegalSection[];
  updated: string;
}) {
  const router = useRouter();
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 border-b border-border px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#18181b" />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">{title}</Text>
      </View>
      <ScrollView contentContainerClassName="p-5 gap-6 pb-16">
        {sections.map((s, i) => (
          <View key={i} className="gap-2">
            {s.heading ? (
              <Text className="text-base font-bold text-foreground">{s.heading}</Text>
            ) : null}
            {s.body.map((p, j) => (
              <Text key={j} className="text-sm leading-6 text-muted-foreground">
                {p}
              </Text>
            ))}
          </View>
        ))}
        <Text className="mt-2 text-center text-xs text-muted-foreground">
          최종 수정일: {updated}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
