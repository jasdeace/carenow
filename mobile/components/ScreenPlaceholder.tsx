import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

// Temporary stand-in for screens not yet migrated from the web app.
export function ScreenPlaceholder({ icon, label }: Props) {
  return (
    <SafeAreaView edges={['top']} className="flex-1 items-center justify-center bg-secondary">
      <Ionicons name={icon} size={48} color="#d4d4d8" />
      <Text className="mt-3 text-base text-muted-foreground">{label}</Text>
      <Text className="mt-1 text-xs text-muted-foreground">곧 제공됩니다</Text>
    </SafeAreaView>
  );
}
