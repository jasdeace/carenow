import { View } from 'react-native';
import Svg, { Polyline, Circle, G, Text as SvgText, Line } from 'react-native-svg';

type Series = { values: number[]; color: string };

type Props = {
  series: Series[];
  height?: number;
  showValues?: boolean;
};

// Lightweight multi-line chart — replaces recharts for the vitals screen.
export function LineChartMini({ series, height = 160, showValues = true }: Props) {
  const all = series.flatMap((s) => s.values);
  if (all.length < 2) return null;

  const min = Math.min(...all);
  const max = Math.max(...all);
  const range = max - min || 1;
  const W = 320;
  const H = height;
  const padX = 14;
  const padY = showValues ? 22 : 14;

  const xFor = (i: number, len: number) =>
    padX + (i / Math.max(1, len - 1)) * (W - padX * 2);
  const yFor = (v: number) => padY + (1 - (v - min) / range) * (H - padY * 2);

  // 3 horizontal grid lines (top / mid / bottom)
  const gridYs = [padY, padY + (H - padY * 2) / 2, H - padY];

  return (
    <View style={{ height }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {gridYs.map((y, i) => (
          <Line
            key={`g${i}`}
            x1={padX}
            y1={y}
            x2={W - padX}
            y2={y}
            stroke="#EBE5D6"
            strokeWidth={0.5}
            strokeDasharray="3 3"
          />
        ))}
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
                <Circle
                  key={i}
                  cx={xFor(i, s.values.length)}
                  cy={yFor(v)}
                  r={3.5}
                  fill="#ffffff"
                  stroke={s.color}
                  strokeWidth={2}
                />
              ))}
              {showValues &&
                s.values.map((v, i) => (
                  <SvgText
                    key={`t${i}`}
                    x={xFor(i, s.values.length)}
                    y={yFor(v) - 8}
                    fill={s.color}
                    fontSize={10}
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {Number.isInteger(v) ? v : v.toFixed(1)}
                  </SvgText>
                ))}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
