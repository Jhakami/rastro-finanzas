import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { formatPEN } from '@/domain/money';
import { colors } from '@/theme';

interface FlowPoint {
  label: string;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  cumulativeCents: number;
}
export function FlowChart({ data, cumulative }: { data: FlowPoint[]; cumulative: boolean }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [details, setDetails] = useState(false);
  const values = data.map((p) => (cumulative ? p.cumulativeCents : p.netCents));
  const min = Math.min(0, ...data.map((p) => -p.expenseCents), ...values);
  const max = Math.max(100, ...data.map((p) => p.incomeCents), ...values);
  const y = (value: number) => 20 + (150 * (max - value)) / (max - min);
  const slot = 290 / Math.max(1, data.length);
  const x = (i: number) => 58 + slot * (i + 0.5);
  const path = values.map((value, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(value)}`).join(' ');
  const point = selected === null ? null : data[selected];
  return (
    <View>
      <Svg
        width="100%"
        height={210}
        viewBox="0 0 360 210"
        accessibilityLabel={cumulative ? 'Flujo acumulado del periodo' : 'Flujo diario del periodo'}
      >
        {[min, 0, max]
          .filter((v, i, a) => a.indexOf(v) === i)
          .map((value) => (
            <Line
              key={value}
              x1={55}
              x2={350}
              y1={y(value)}
              y2={y(value)}
              stroke={value === 0 ? colors.muted : colors.line}
            />
          ))}
        <SvgText x={0} y={18} fill={colors.muted} fontSize={9}>
          {formatPEN(max)}
        </SvgText>
        <SvgText x={0} y={178} fill={colors.muted} fontSize={9}>
          {formatPEN(min)}
        </SvgText>
        {data.map((p, i) => (
          <ViewPoint
            key={p.label}
            p={p}
            x={x(i)}
            slot={slot}
            y={y}
            label={i === 0 || i === data.length - 1 || i % 7 === 0}
          />
        ))}
        <Path d={path} fill="none" stroke={colors.blue} strokeWidth={2.5} />
        {values.map((value, i) => (
          <Circle
            key={i}
            cx={x(i)}
            cy={y(value)}
            r={selected === i ? 6 : 3}
            fill={colors.blue}
            onPress={() => setSelected(i)}
          />
        ))}
      </Svg>
      <Text style={{ color: colors.muted }}>
        Verde: entradas · Rosa: gastos · Azul: {cumulative ? 'flujo acumulado' : 'flujo diario'}
      </Text>
      <Text style={{ color: colors.ink, marginTop: 8 }}>
        {point
          ? `${point.label}: ${formatPEN(cumulative ? point.cumulativeCents : point.netCents)}`
          : 'Toca un punto o consulta los valores diarios.'}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: details }}
        onPress={() => setDetails(!details)}
        style={{ paddingVertical: 14 }}
      >
        <Text style={{ color: colors.green, fontWeight: '700' }}>
          {details ? 'Ocultar valores diarios' : 'Ver valores diarios'}
        </Text>
      </Pressable>
      {details
        ? data.map((p) => (
            <Text key={p.label} style={{ color: colors.ink, marginBottom: 10 }}>
              {p.label} · Entradas {formatPEN(p.incomeCents)} · Gastos {formatPEN(p.expenseCents)} ·
              Flujo {formatPEN(cumulative ? p.cumulativeCents : p.netCents)}
            </Text>
          ))
        : null}
    </View>
  );
}
function ViewPoint({
  p,
  x,
  slot,
  y,
  label,
}: {
  p: FlowPoint;
  x: number;
  slot: number;
  y: (v: number) => number;
  label: boolean;
}) {
  return (
    <>
      {p.incomeCents > 0 ? (
        <Rect
          x={x - slot * 0.3}
          y={y(p.incomeCents)}
          width={slot * 0.27}
          height={y(0) - y(p.incomeCents)}
          fill={colors.green}
        />
      ) : null}
      {p.expenseCents > 0 ? (
        <Rect
          x={x + slot * 0.03}
          y={y(0)}
          width={slot * 0.27}
          height={y(-p.expenseCents) - y(0)}
          fill={colors.red}
        />
      ) : null}
      {label ? (
        <SvgText x={x} y={198} textAnchor="middle" fill={colors.muted} fontSize={9}>
          {p.label}
        </SvgText>
      ) : null}
    </>
  );
}
