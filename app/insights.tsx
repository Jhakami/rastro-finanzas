import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card, ScreenHeader } from '@/presentation/components';
import { useFinance } from '@/presentation/finance-provider';
import { colors, radius, spacing } from '@/theme';

export default function InsightsScreen() {
  const { insights } = useFinance();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          eyebrow="Sin juicios, con evidencia"
          title="Tus patrones"
          action={
            <Pressable onPress={() => router.back()} style={styles.close}>
              <Ionicons name="close" size={22} color={colors.ink} />
            </Pressable>
          }
        />
        <Text style={styles.intro}>
          Cada hallazgo indica la muestra y el cálculo que lo respalda. Nunca inferimos emociones ni
          personalidad.
        </Text>
        {insights.map((insight) => (
          <Card key={insight.id} style={styles.card}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{insight.sampleSize} MOVIMIENTOS</Text>
            </View>
            <Text style={styles.title}>{insight.title}</Text>
            <Text style={styles.summary}>{insight.summary}</Text>
            <View style={styles.evidence}>
              <Ionicons name="flask-outline" size={18} color={colors.blue} />
              <Text style={styles.evidenceText}>{insight.evidence}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.mauve} />
              <Text style={styles.detailText}>{insight.period}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="calculator-outline" size={16} color={colors.teal} />
              <Text style={styles.detailText}>{insight.calculation}</Text>
            </View>
            <Text style={styles.level}>
              Evidencia:{' '}
              {insight.confidence === 'strong'
                ? 'fuerte'
                : insight.confidence === 'emerging'
                  ? 'inicial'
                  : 'insuficiente'}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.md, gap: spacing.md },
  close: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  intro: { color: colors.muted, lineHeight: 21, marginTop: -10 },
  card: { gap: 9 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.greenSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: { color: colors.green, fontSize: 10, fontWeight: '900' },
  title: { color: colors.ink, fontWeight: '900', fontSize: 20 },
  summary: { color: colors.ink, lineHeight: 22 },
  evidence: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.surface1,
    borderRadius: radius.sm,
    padding: 12,
  },
  evidenceText: { color: colors.blue, flex: 1, lineHeight: 19 },
  detailRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  detailText: { color: colors.muted, flex: 1, fontSize: 12, lineHeight: 18 },
  level: { color: colors.muted, fontSize: 12 },
});
