import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';

export function ScreenHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function MetricCard({
  label,
  value,
  hint,
  tone = 'dark',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'dark' | 'light' | 'green';
}) {
  const dark = tone === 'dark';
  return (
    <View
      style={[styles.metric, tone === 'green' && styles.metricGreen, dark && styles.metricDark]}
    >
      <Text style={[styles.metricLabel, dark && styles.onDarkMuted]}>{label}</Text>
      <Text style={[styles.metricValue, dark && styles.onDark]}>{value}</Text>
      {hint ? <Text style={[styles.metricHint, dark && styles.onDarkMuted]}>{hint}</Text> : null}
    </View>
  );
}

export function EmptyState({
  icon = 'leaf-outline',
  title,
  body,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={24} color={colors.green} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

export function LoadingView() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.green} />
      <Text style={styles.emptyBody}>Preparando tus datos…</Text>
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color,
}: {
  label: string;
  selected?: boolean;
  onPress(): void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        selected && { backgroundColor: color ?? colors.green, borderColor: color ?? colors.green },
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  headerText: { flex: 1 },
  eyebrow: {
    color: colors.green,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: '800', marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
  },
  metric: {
    flex: 1,
    minWidth: 145,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  metricDark: { backgroundColor: colors.ink, borderColor: colors.ink },
  metricGreen: { backgroundColor: colors.greenSoft, borderColor: colors.greenSoft },
  metricLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  metricValue: { color: colors.ink, fontSize: 22, fontWeight: '800', marginTop: 8 },
  metricHint: { color: colors.muted, fontSize: 12, marginTop: 4 },
  onDark: { color: colors.white },
  onDarkMuted: { color: '#B9C5BD' },
  empty: { alignItems: 'center', padding: spacing.xl },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', marginTop: spacing.md },
  emptyBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  chipText: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  chipTextSelected: { color: colors.white },
});
