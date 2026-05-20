import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { COLORS } from '@/constants/design';

type IconProps = { color: string; size?: number };

const ICONS: Record<string, (p: IconProps) => React.ReactElement> = {
  home: ({ color, size = 22 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.5 11L12 4l8.5 7M5.5 10v9.5h5V14h3v5.5h5V10"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  ),
  pulse: ({ color, size = 22 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12h3l2-5 4 10 2.5-7 1.5 2H21"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  ),
  pill: ({ color, size = 22 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={9} width={18} height={8} rx={4} stroke={color} strokeWidth={1.6} />
      <Path d="M12 9v8" stroke={color} strokeWidth={1.6} />
    </Svg>
  ),
  spark: ({ color, size = 22 }) => (
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
  ),
  user: ({ color, size = 22 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={3.6} stroke={color} strokeWidth={1.6} />
      <Path
        d="M4.5 20c1.2-3.6 4.2-5.5 7.5-5.5s6.3 1.9 7.5 5.5"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  ),
};

const TAB_META: Record<string, { label: string; icon: keyof typeof ICONS; big?: boolean }> = {
  index: { label: '홈', icon: 'home' },
  vitals: { label: '건강수치', icon: 'pulse' },
  ai: { label: 'AI', icon: 'spark', big: true },
  medications: { label: '약', icon: 'pill' },
  profile: { label: '프로필', icon: 'user' },
};

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 22);

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: COLORS.line,
        backgroundColor: 'rgba(250, 247, 241, 0.92)',
        paddingTop: 8,
        paddingHorizontal: 8,
        paddingBottom: bottomPad,
        flexDirection: 'row',
      }}
    >
      {state.routes.map((route, idx) => {
        const meta = TAB_META[route.name];
        if (!meta) return null;

        const isFocused = state.index === idx;
        const color = isFocused ? COLORS.teal[700] : COLORS.ink[400];
        const Icon = ICONS[meta.icon];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={descriptors[route.key]?.options.tabBarAccessibilityLabel ?? meta.label}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingTop: 8,
              paddingBottom: 4,
              gap: 4,
            }}
          >
            {meta.big ? (
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  marginTop: -6,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isFocused ? COLORS.teal[700] : COLORS.cream[100],
                }}
              >
                <Icon color={isFocused ? '#FFFFFF' : COLORS.ink[500]} />
              </View>
            ) : (
              <Icon color={color} />
            )}
            <Text
              style={{
                fontSize: 10.5,
                fontWeight: '600',
                letterSpacing: -0.1,
                color,
              }}
            >
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
