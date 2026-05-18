import { View } from 'react-native';
import Svg, { Polyline, Circle, G } from 'react-native-svg';

type Series = { values: number[]; color: string };

type Props = {
  series: Series[];
  height?: number;
};

// Lightweight multi-line chart — replaces recharts for the vitals screen.
export function LineChartMini({ series, height = 140 }: Props) {
  const all = series.flatMap((s) => s.values);
  if (all.length < 2) return null;

  const min = Math.min(...all);
  const max = Math.max(...all);
  const range = max - min || 1;
  const W = 320;
  const H = height;
  const padX = 8;
  const padY = 14;

  const xFor = (i: number, len: number) =>
    padX + (i / Math.max(1, len - 1)) * (W - padX * 2);
  const yFor = (v: number) => padY + (1 - (v - min) / range) * (H - padY * 2);

  return (
    <View style={{ height }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {series.map((s, si) => {
          const points = s.values
            .map((v, i) => `${xFor(i, s.values.length)},${yFor(v)}`)
            .join(' ');
          return (
            <G key={si}>
              <Polyline
                points={points}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {s.values.map((v, i) => (
                <Circle key={i} cx={xFor(i, s.values.length)} cy={yFor(v)} r={3} fill={s.color} />
              ))}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
