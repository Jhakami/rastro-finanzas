import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { colors } from '@/theme';

export interface ChartDatum {
  label: string;
  value: number;
  color?: string;
}

export function DonutChart({
  data,
  centerValue,
  centerLabel,
}: {
  data: ChartDatum[];
  centerValue: string;
  centerLabel: string;
}) {
  const total = Math.max(
    1,
    data.reduce((sum, item) => sum + item.value, 0),
  );
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const segments = data.map((item, index) => {
    const previous = data
      .slice(0, index)
      .reduce((sum, preceding) => sum + (preceding.value / total) * circumference, 0);
    return {
      ...item,
      length: (item.value / total) * circumference,
      dashOffset: -previous,
    };
  });

  return (
    <Svg width={150} height={150} viewBox="0 0 150 150" accessibilityLabel="Gráfico de composición">
      <Circle cx="75" cy="75" r={radius} stroke={colors.surface1} strokeWidth="16" fill="none" />
      <G rotation="-90" origin="75, 75">
        {segments.map((item) => {
          return (
            <Circle
              key={item.label}
              cx="75"
              cy="75"
              r={radius}
              stroke={item.color ?? colors.mauve}
              strokeWidth="16"
              strokeLinecap="butt"
              strokeDasharray={`${item.length} ${circumference - item.length}`}
              strokeDashoffset={item.dashOffset}
              fill="none"
            />
          );
        })}
      </G>
      <SvgText x="75" y="70" fill={colors.ink} fontSize="18" fontWeight="800" textAnchor="middle">
        {centerValue}
      </SvgText>
      <SvgText x="75" y="89" fill={colors.muted} fontSize="10" textAnchor="middle">
        {centerLabel}
      </SvgText>
    </Svg>
  );
}

export function AreaTrendChart({ data }: { data: ChartDatum[] }) {
  const width = 340;
  const height = 180;
  const left = 12;
  const right = 8;
  const top = 14;
  const bottom = 30;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maximum = Math.max(...data.map((item) => item.value), 1);
  const points = data.map((item, index) => ({
    x: left + (index / Math.max(1, data.length - 1)) * chartWidth,
    y: top + chartHeight - (item.value / maximum) * chartHeight,
  }));
  const linePath = points
    .map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`)
    .join(' ');
  const areaPath = points.length
    ? `${linePath} L ${points.at(-1)?.x ?? left} ${top + chartHeight} L ${left} ${top + chartHeight} Z`
    : '';

  return (
    <Svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      accessibilityLabel="Tendencia de gasto"
    >
      <Defs>
        <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.mauve} stopOpacity="0.42" />
          <Stop offset="1" stopColor={colors.mauve} stopOpacity="0.02" />
        </LinearGradient>
      </Defs>
      {[0, 0.5, 1].map((ratio) => (
        <Line
          key={ratio}
          x1={left}
          x2={width - right}
          y1={top + chartHeight * ratio}
          y2={top + chartHeight * ratio}
          stroke={colors.surface1}
          strokeWidth="1"
        />
      ))}
      {areaPath ? <Path d={areaPath} fill="url(#trendFill)" /> : null}
      {linePath ? (
        <Path
          d={linePath}
          fill="none"
          stroke={colors.mauve}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      ) : null}
      {points.map((point, index) => (
        <Circle
          key={`${data[index]?.label}-${index}`}
          cx={point.x}
          cy={point.y}
          r="3.5"
          fill={colors.teal}
          stroke={colors.crust}
          strokeWidth="1.5"
        />
      ))}
      {data.map((item, index) => {
        if (data.length > 14 && index % 3 !== 0 && index !== data.length - 1) return null;
        return (
          <SvgText
            key={`label-${item.label}-${index}`}
            x={points[index]?.x ?? left}
            y={height - 8}
            fill={colors.muted}
            fontSize="9"
            textAnchor="middle"
          >
            {item.label}
          </SvgText>
        );
      })}
    </Svg>
  );
}

export function PastelBarChart({ data }: { data: ChartDatum[] }) {
  const width = 340;
  const height = 155;
  const top = 12;
  const bottom = 28;
  const maximum = Math.max(...data.map((item) => item.value), 1);
  const slot = width / Math.max(1, data.length);
  const barWidth = Math.max(5, Math.min(24, slot * 0.55));

  return (
    <Svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      accessibilityLabel="Gasto diario en barras"
    >
      <Line x1="0" x2={width} y1={height - bottom} y2={height - bottom} stroke={colors.surface1} />
      {data.map((item, index) => {
        const barHeight = item.value
          ? Math.max(4, (item.value / maximum) * (height - top - bottom))
          : 2;
        const x = index * slot + (slot - barWidth) / 2;
        const y = height - bottom - barHeight;
        return (
          <G key={`${item.label}-${index}`}>
            <Rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx="4"
              fill={item.color ?? colors.blue}
            />
            <SvgText
              x={x + barWidth / 2}
              y={height - 10}
              fill={colors.muted}
              fontSize="9"
              textAnchor="middle"
            >
              {item.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

export function ScatterChart({ points }: { points: { id: string; x: number; y: number }[] }) {
  const width = 340;
  const height = 170;
  const left = 25;
  const right = 10;
  const top = 12;
  const bottom = 28;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maximum = Math.max(...points.map((point) => point.y), 1);

  return (
    <Svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      accessibilityLabel="Dispersión de monto por hora"
    >
      {[0, 0.5, 1].map((ratio) => (
        <Line
          key={ratio}
          x1={left}
          x2={width - right}
          y1={top + chartHeight * ratio}
          y2={top + chartHeight * ratio}
          stroke={colors.surface1}
        />
      ))}
      {points.map((point, index) => (
        <Circle
          key={point.id}
          cx={left + (Math.min(24, Math.max(0, point.x)) / 24) * chartWidth}
          cy={top + chartHeight - (point.y / maximum) * chartHeight}
          r={4 + Math.min(3, index % 3)}
          fill={[colors.teal, colors.pink, colors.blue][index % 3]}
          fillOpacity="0.82"
          stroke={colors.crust}
          strokeWidth="1"
        />
      ))}
      {[0, 6, 12, 18, 24].map((hour) => (
        <SvgText
          key={hour}
          x={left + (hour / 24) * chartWidth}
          y={height - 8}
          fill={colors.muted}
          fontSize="9"
          textAnchor="middle"
        >
          {`${String(hour).padStart(2, '0')} h`}
        </SvgText>
      ))}
    </Svg>
  );
}
