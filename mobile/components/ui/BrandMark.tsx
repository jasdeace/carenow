import Svg, { Rect, Path, G, Defs, LinearGradient, Stop } from 'react-native-svg';

import { COLORS } from '@/constants/design';

// Bodacare brand mark — teal squircle containing a rotated pill capsule with
// a heartbeat line, half cream + half coral. Ported from redesign/logo.jsx so
// the in-app mark stays in sync with the marketing site.
export function BrandMark({ size = 56 }: { size?: number }) {
  const r = Math.round(size * 0.28);
  const gradId = `bm-${size}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="rgba(255,255,255,0.10)" />
          <Stop offset="1" stopColor="rgba(0,0,0,0.05)" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="64" height="64" rx={r} fill={COLORS.teal[700]} />
      <Rect x="0" y="0" width="64" height="64" rx={r} fill={`url(#${gradId})`} />
      <G transform="translate(32 32) rotate(-32) translate(-22 -9)">
        <Rect x="0" y="0" width="44" height="18" rx="9" fill="#FAF7F1" />
        <Path
          d="M22 0 H44 a9 9 0 0 1 9 9 v0 a9 9 0 0 1 -9 9 H22 Z"
          fill={COLORS.coral[500]}
          transform="translate(-9 0)"
        />
        <Rect x="21" y="0" width="2" height="18" fill="rgba(15,44,46,0.10)" />
        <Path
          d="M5 9 L13 9 L16 4 L20 14 L24 7 L28 9 L40 9"
          fill="none"
          stroke="rgba(15,44,46,0.85)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  );
}
