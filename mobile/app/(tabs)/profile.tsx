import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/authStore';
import { formatPhone } from '@/lib/phoneUtils';

export default function Profile() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile, signOut } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-secondary">
      <ScrollView contentContainerClassName="p-4 gap-4">
        <Text className="text-2xl font-bold text-foreground">{t('profile.title')}</Text>

        {/* My info */}
        <View className="rounded-2xl bg-background p-4">
          <View className="mb-3 flex-row items-center gap-2">
            <Ionicons name="person" size={20} color="#16a34a" />
            <Text className="text-lg font-bold text-foreground">{t('profile.my_info')}</Text>
          </View>
          <Text className="text-sm text-muted-foreground">{t('profile.name')}</Text>
          <Text className="mb-3 text-base text-foreground">{profile?.name_ko || '-'}</Text>
          <Text className="text-sm text-muted-foreground">{t('profile.phone')}</Text>
          <Text className="text-base text-foreground">
            {profile?.phone_kr ? formatPhone(profile.phone_kr) : '-'}
          </Text>
        </View>

        {/* Language */}
        <View className="rounded-2xl bg-background p-4">
          <View className="mb-3 flex-row items-center gap-2">
            <Ionicons name="globe" size={20} color="#16a34a" />
            <Text className="text-lg font-bold text-foreground">{t('profile.language')}</Text>
          </View>
          <View className="flex-row gap-2">
            {(['ko', 'en'] as const).map((lng) => (
              <Pressable
                key={lng}
                onPress={() => i18n.changeLanguage(lng)}
                className={`flex-1 items-center rounded-xl border py-2.5 ${
                  i18n.language === lng ? 'border-primary bg-primary/10' : 'border-border'
                }`}
              >
                <Text
                  className={i18n.language === lng ? 'font-bold text-primary' : 'text-foreground'}
                >
                  {lng === 'ko' ? '한국어' : 'English'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Sign out */}
        <Pressable
          onPress={handleSignOut}
          className="mt-2 h-12 flex-row items-center justify-center gap-2 rounded-xl bg-background"
        >
          <Ionicons name="log-out-outline" size={20} color="#71717a" />
          <Text className="text-base font-medium text-muted-foreground">{t('profile.signout')}</Text>
        </Pressable>

        <Text className="mt-2 text-center text-xs text-muted-foreground">
          CareNow · React Native · Phase 0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
