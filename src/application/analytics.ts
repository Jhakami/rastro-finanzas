import { differenceInCalendarDays, endOfMonth, getDate, startOfDay, subDays } from 'date-fns';
import type {
  BehaviorSettings,
  Category,
  DashboardMetrics,
  FinanceTransaction,
  Insight,
  SpendingLimit,
} from '@/domain/types';

const MIN_PATTERN_SAMPLE = 10;
const MIN_PATTERN_DAYS = 3;

export const DEFAULT_BEHAVIOR_SETTINGS: BehaviorSettings = {
  historyMonths: 3,
  elevatedPercent: 20,
  outlierStandardDeviations: 2,
  growthMonths: 3,
  shareIncreasePoints: 10,
};

interface InsightOptions {
  settings?: BehaviorSettings;
  categories?: Category[];
  limits?: SpendingLimit[];
  now?: Date;
}

export function normalizeBehaviorSettings(value: unknown): BehaviorSettings {
  const input = typeof value === 'object' && value !== null ? value : {};
  const candidate = input as Partial<BehaviorSettings>;
  return {
    historyMonths: candidate.historyMonths === 6 ? 6 : 3,
    elevatedPercent: clamp(candidate.elevatedPercent, 5, 100, 20),
    outlierStandardDeviations: clamp(candidate.outlierStandardDeviations, 1, 4, 2),
    growthMonths: clamp(candidate.growthMonths, 2, 6, 3),
    shareIncreasePoints: clamp(candidate.shareIncreasePoints, 3, 50, 10),
  };
}

export interface DailyExpensePoint {
  dateKey: string;
  weekday: number;
  amountCents: number;
  count: number;
}

function localDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function buildDailyExpenseTrend(
  transactions: FinanceTransaction[],
  days = 7,
  now = new Date(),
): DailyExpensePoint[] {
  const safeDays = Math.max(1, Math.min(31, Math.trunc(days)));
  const points = Array.from({ length: safeDays }, (_, index) => {
    const date = subDays(startOfDay(now), safeDays - index - 1);
    return { dateKey: localDateKey(date), weekday: date.getDay(), amountCents: 0, count: 0 };
  });
  const byDate = new Map(points.map((point) => [point.dateKey, point]));

  transactions
    .filter((item) => item.kind === 'expense' && !item.deletedAt)
    .forEach((item) => {
      const point = byDate.get(localDateKey(new Date(item.occurredAt)));
      if (point) {
        point.amountCents += item.amountCents;
        point.count += 1;
      }
    });
  return points;
}

export function isMicroExpense(transaction: FinanceTransaction, thresholdCents: number): boolean {
  if (transaction.kind !== 'expense' || transaction.deletedAt) return false;
  if (transaction.microOverride !== null && transaction.microOverride !== undefined) {
    return transaction.microOverride;
  }
  return transaction.amountCents <= thresholdCents;
}

export function calculateMetrics(
  transactions: FinanceTransaction[],
  thresholdCents: number,
  now = new Date(),
): DashboardMetrics {
  const active = transactions.filter((item) => !item.deletedAt);
  const expenses = active.filter((item) => item.kind === 'expense');
  const incomeCents = active
    .filter((item) => item.kind === 'income' || item.kind === 'refund')
    .reduce((sum, item) => sum + item.amountCents, 0);
  const expenseCents = expenses.reduce((sum, item) => sum + item.amountCents, 0);
  const micro = expenses.filter((item) => isMicroExpense(item, thresholdCents));

  const categoryTotals = new Map<string, number>();
  const hourCounts = new Map<number, number>();
  const weekdayCounts = new Map<number, number>();
  expenses.forEach((item) => {
    if (item.categoryId) {
      categoryTotals.set(
        item.categoryId,
        (categoryTotals.get(item.categoryId) ?? 0) + item.amountCents,
      );
    }
    const date = new Date(item.occurredAt);
    hourCounts.set(date.getHours(), (hourCounts.get(date.getHours()) ?? 0) + 1);
    weekdayCounts.set(date.getDay(), (weekdayCounts.get(date.getDay()) ?? 0) + 1);
  });

  const elapsedDays = Math.max(1, getDate(now));
  const daysInMonth =
    differenceInCalendarDays(endOfMonth(now), new Date(now.getFullYear(), now.getMonth(), 1)) + 1;

  return {
    incomeCents,
    expenseCents,
    netCents: incomeCents - expenseCents,
    microExpenseCents: micro.reduce((sum, item) => sum + item.amountCents, 0),
    microCount: micro.length,
    projectedExpenseCents: Math.round((expenseCents / elapsedDays) * daysInMonth),
    topCategoryId: maxKey(categoryTotals),
    busiestHour: maxKey(hourCounts),
    busiestWeekday: maxKey(weekdayCounts),
  };
}

function maxKey<T>(values: Map<T, number>): T | null {
  let result: T | null = null;
  let maximum = -1;
  values.forEach((value, key) => {
    if (value > maximum) {
      result = key;
      maximum = value;
    }
  });
  return result;
}

export function buildInsights(
  transactions: FinanceTransaction[],
  thresholdCents: number,
  options: InsightOptions = {},
): Insight[] {
  const settings = normalizeBehaviorSettings(options.settings ?? DEFAULT_BEHAVIOR_SETTINGS);
  const categories = options.categories ?? [];
  const limits = options.limits ?? [];
  const now = options.now ?? new Date();
  const expenses = transactions.filter((item) => item.kind === 'expense' && !item.deletedAt);
  const uniqueDays = countDays(expenses);
  if (expenses.length < MIN_PATTERN_SAMPLE || uniqueDays < MIN_PATTERN_DAYS) {
    return [
      {
        id: 'insufficient-data',
        title: 'Aún estamos aprendiendo',
        summary: 'Registra al menos 10 gastos distribuidos en 3 días.',
        evidence: `${expenses.length} gastos en ${uniqueDays} día${uniqueDays === 1 ? '' : 's'}.`,
        sampleSize: expenses.length,
        confidence: 'insufficient',
        relatedTransactionIds: expenses.map((item) => item.id),
        period: 'Todo el historial disponible',
        calculation: `Mínimo requerido: ${MIN_PATTERN_SAMPLE} gastos en ${MIN_PATTERN_DAYS} días.`,
      },
    ];
  }

  const currentMonthKey = monthKey(now);
  const previousMonthKey = offsetMonthKey(now, -1);
  const historicalKeys = new Set(
    Array.from({ length: settings.historyMonths }, (_, index) => offsetMonthKey(now, -index - 1)),
  );
  const currentTransactions = transactions.filter(
    (item) => !item.deletedAt && monthKey(new Date(item.occurredAt)) === currentMonthKey,
  );
  const currentExpenses = currentTransactions.filter((item) => item.kind === 'expense');
  const historicalExpenses = expenses.filter((item) =>
    historicalKeys.has(monthKey(new Date(item.occurredAt))),
  );
  const previousExpenses = expenses.filter(
    (item) => monthKey(new Date(item.occurredAt)) === previousMonthKey,
  );
  const metrics = calculateMetrics(currentTransactions, thresholdCents, now);
  const historicalMetrics = calculateMetrics(expenses, thresholdCents, now);
  const micro = expenses.filter((item) => isMicroExpense(item, thresholdCents));
  const insights: Insight[] = [];
  if (micro.length >= 3) {
    const ratio =
      historicalMetrics.expenseCents === 0
        ? 0
        : Math.round((historicalMetrics.microExpenseCents / historicalMetrics.expenseCents) * 100);
    insights.push({
      id: 'micro-accumulation',
      title: 'Compras pequeñas que se acumulan',
      summary: `${micro.length} compras representan ${ratio}% de tus gastos.`,
      evidence: `Umbral S/ ${(thresholdCents / 100).toFixed(2)}; total S/ ${(historicalMetrics.microExpenseCents / 100).toFixed(2)}.`,
      sampleSize: micro.length,
      confidence: micro.length >= 10 ? 'strong' : 'emerging',
      relatedTransactionIds: micro.map((item) => item.id),
      period: 'Todo el historial disponible',
      calculation: `Suma de gastos ≤ S/ ${(thresholdCents / 100).toFixed(2)} ÷ gasto total.`,
    });
  }
  if (historicalMetrics.busiestHour !== null) {
    const related = expenses.filter(
      (item) => new Date(item.occurredAt).getHours() === historicalMetrics.busiestHour,
    );
    insights.push({
      id: 'busiest-hour',
      title: 'Hora con más compras',
      summary: `Tu mayor frecuencia aparece entre ${String(historicalMetrics.busiestHour).padStart(2, '0')}:00 y ${String(historicalMetrics.busiestHour + 1).padStart(2, '0')}:00.`,
      evidence: `${related.length} de ${expenses.length} movimientos del periodo.`,
      sampleSize: related.length,
      confidence: related.length >= 5 ? 'strong' : 'emerging',
      relatedTransactionIds: related.map((item) => item.id),
      period: 'Todo el historial disponible',
      calculation: 'Conteo de compras agrupadas por hora local.',
    });
  }

  const currentByCategory = totalsByCategory(currentExpenses);
  const historicalIncrease = [...currentByCategory.entries()]
    .map(([categoryId, currentTotal]) => {
      const sample = historicalExpenses.filter((item) => item.categoryId === categoryId);
      const average =
        sample.reduce((sum, item) => sum + item.amountCents, 0) / settings.historyMonths;
      return {
        categoryId,
        currentTotal,
        average,
        sample,
        ratio: average ? currentTotal / average : 0,
      };
    })
    .filter(
      (item) =>
        hasPatternSample(item.sample) &&
        item.average > 0 &&
        item.ratio >= 1 + settings.elevatedPercent / 100,
    )
    .sort((a, b) => b.ratio - a.ratio)[0];
  if (historicalIncrease) {
    insights.push({
      id: `historical-increase-${historicalIncrease.categoryId}`,
      title: `Gasto elevado en ${categoryName(historicalIncrease.categoryId, categories)}`,
      summary: `Este mes llevas ${Math.round((historicalIncrease.ratio - 1) * 100)}% más que tu promedio histórico mensual.`,
      evidence: `Actual S/ ${(historicalIncrease.currentTotal / 100).toFixed(2)} frente a promedio S/ ${(historicalIncrease.average / 100).toFixed(2)}.`,
      sampleSize: historicalIncrease.sample.length,
      confidence: confidenceFor(historicalIncrease.sample.length),
      relatedTransactionIds: [
        ...historicalIncrease.sample,
        ...currentExpenses.filter((item) => item.categoryId === historicalIncrease.categoryId),
      ].map((item) => item.id),
      period: `Mes actual frente a ${settings.historyMonths} meses completos`,
      calculation: `Actual > promedio × ${(1 + settings.elevatedPercent / 100).toFixed(2)}.`,
    });
  }

  const outlier = currentExpenses
    .map((transaction) => {
      const sample = historicalExpenses.filter(
        (item) => item.categoryId === transaction.categoryId,
      );
      const mean = sample.length
        ? sample.reduce((sum, item) => sum + item.amountCents, 0) / sample.length
        : 0;
      const deviation = standardDeviation(
        sample.map((item) => item.amountCents),
        mean,
      );
      const zScore = deviation ? (transaction.amountCents - mean) / deviation : 0;
      return { transaction, sample, mean, deviation, zScore };
    })
    .filter(
      (item) =>
        hasPatternSample(item.sample) &&
        item.deviation > 0 &&
        item.zScore > settings.outlierStandardDeviations,
    )
    .sort((a, b) => b.zScore - a.zScore)[0];
  if (outlier) {
    insights.push({
      id: `outlier-${outlier.transaction.id}`,
      title: `Compra inusual en ${categoryName(outlier.transaction.categoryId, categories)}`,
      summary: `El monto ${formatCompact(outlier.transaction.amountCents)} se aleja de lo habitual para esta categoría.`,
      evidence: `Promedio ${formatCompact(outlier.mean)}; desviación ${formatCompact(outlier.deviation)}; distancia ${outlier.zScore.toFixed(1)}σ.`,
      sampleSize: outlier.sample.length,
      confidence: confidenceFor(outlier.sample.length),
      relatedTransactionIds: [outlier.transaction.id, ...outlier.sample.map((item) => item.id)],
      period: `Mes actual frente a ${settings.historyMonths} meses completos`,
      calculation: `Atípico si monto > promedio + ${settings.outlierStandardDeviations}σ.`,
    });
  }

  const streakKeys = Array.from({ length: settings.growthMonths + 1 }, (_, index) =>
    offsetMonthKey(now, index - settings.growthMonths),
  );
  const streak = [...new Set(expenses.map((item) => item.categoryId).filter(Boolean))]
    .map((categoryId) => {
      const related = expenses.filter((item) => item.categoryId === categoryId);
      const totals = streakKeys.map((key) =>
        related
          .filter((item) => monthKey(new Date(item.occurredAt)) === key)
          .reduce((sum, item) => sum + item.amountCents, 0),
      );
      const growing = totals.every(
        (value, index) => value > 0 && (index === 0 || value > (totals[index - 1] ?? 0)),
      );
      return { categoryId, related, totals, growing };
    })
    .filter((item) => item.growing && hasPatternSample(item.related))
    .sort((a, b) => (b.totals.at(-1) ?? 0) - (a.totals.at(-1) ?? 0))[0];
  if (streak?.categoryId) {
    insights.push({
      id: `growth-streak-${streak.categoryId}`,
      title: `Racha de crecimiento en ${categoryName(streak.categoryId, categories)}`,
      summary: `El gasto aumentó durante ${settings.growthMonths} comparaciones mensuales consecutivas.`,
      evidence: streak.totals.map((value) => formatCompact(value)).join(' → '),
      sampleSize: streak.related.length,
      confidence: confidenceFor(streak.related.length),
      relatedTransactionIds: streak.related.map((item) => item.id),
      period: `${settings.growthMonths + 1} meses consecutivos`,
      calculation: 'Cada total mensual debe ser mayor que el inmediatamente anterior.',
    });
  }

  const currentTotal = currentExpenses.reduce((sum, item) => sum + item.amountCents, 0);
  const previousTotal = previousExpenses.reduce((sum, item) => sum + item.amountCents, 0);
  const previousByCategory = totalsByCategory(previousExpenses);
  const shareChange = [...currentByCategory.entries()]
    .map(([categoryId, currentAmount]) => {
      const currentShare = currentTotal ? (currentAmount / currentTotal) * 100 : 0;
      const previousShare = previousTotal
        ? ((previousByCategory.get(categoryId) ?? 0) / previousTotal) * 100
        : 0;
      const related = [...currentExpenses, ...previousExpenses].filter(
        (item) => item.categoryId === categoryId,
      );
      return {
        categoryId,
        currentShare,
        previousShare,
        change: currentShare - previousShare,
        related,
      };
    })
    .filter((item) => hasPatternSample(item.related) && item.change >= settings.shareIncreasePoints)
    .sort((a, b) => b.change - a.change)[0];
  if (shareChange) {
    insights.push({
      id: `share-change-${shareChange.categoryId}`,
      title: `${categoryName(shareChange.categoryId, categories)} gana peso`,
      summary: `Ahora representa ${shareChange.currentShare.toFixed(1)}% del gasto mensual, ${shareChange.change.toFixed(1)} puntos más que el mes anterior.`,
      evidence: `Mes anterior ${shareChange.previousShare.toFixed(1)}%; mes actual ${shareChange.currentShare.toFixed(1)}%.`,
      sampleSize: shareChange.related.length,
      confidence: confidenceFor(shareChange.related.length),
      relatedTransactionIds: shareChange.related.map((item) => item.id),
      period: 'Mes actual frente al mes anterior',
      calculation: '% categoría = gasto de categoría ÷ gasto total × 100.',
    });
  }

  if (metrics.incomeCents > 0 && metrics.projectedExpenseCents > metrics.incomeCents) {
    insights.push({
      id: 'projection-over-received',
      title: 'El ritmo proyectado supera lo recibido',
      summary: `Al ritmo actual proyectas ${formatCompact(metrics.projectedExpenseCents)}, por encima de los ${formatCompact(metrics.incomeCents)} recibidos este mes.`,
      evidence: `Diferencia proyectada: ${formatCompact(metrics.projectedExpenseCents - metrics.incomeCents)}.`,
      sampleSize: currentExpenses.length,
      confidence: confidenceFor(currentExpenses.length),
      relatedTransactionIds: currentTransactions.map((item) => item.id),
      period: 'Mes actual',
      calculation: 'Gasto acumulado ÷ días transcurridos × días del mes.',
    });
  }

  limits.forEach((limit) => {
    const related = currentExpenses.filter(
      (item) =>
        (!limit.categoryId || item.categoryId === limit.categoryId) &&
        (!limit.accountId || item.accountId === limit.accountId),
    );
    const spent = related.reduce((sum, item) => sum + item.amountCents, 0);
    const percentage = limit.amountCents ? (spent / limit.amountCents) * 100 : 0;
    if (percentage < limit.warningPercent) return;
    insights.push({
      id: `limit-${limit.id}`,
      title: `${percentage >= 100 ? 'Límite superado' : 'Límite próximo'}: ${limit.name}`,
      summary: `Has utilizado ${percentage.toFixed(0)}% del monto configurado.`,
      evidence: `${formatCompact(spent)} de ${formatCompact(limit.amountCents)}.`,
      sampleSize: related.length,
      confidence: 'strong',
      relatedTransactionIds: related.map((item) => item.id),
      period: 'Mes actual',
      calculation: 'Gasto acumulado ÷ límite × 100.',
    });
  });

  if (!insights.length) {
    insights.push({
      id: 'no-supported-variation',
      title: 'Sin variaciones con evidencia suficiente',
      summary: 'Todavía no hay un cambio que supere tus umbrales configurados.',
      evidence: `${expenses.length} gastos disponibles; seguimos comparando sin forzar conclusiones.`,
      sampleSize: expenses.length,
      confidence: 'insufficient',
      relatedTransactionIds: expenses.map((item) => item.id),
      period: 'Historial disponible',
      calculation: 'Se evaluaron promedio, atípicos, rachas, participación, proyección y límites.',
    });
  }
  return insights;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function offsetMonthKey(date: Date, offset: number): string {
  return monthKey(new Date(date.getFullYear(), date.getMonth() + offset, 1));
}

function countDays(transactions: FinanceTransaction[]): number {
  return new Set(transactions.map((item) => localDateKey(new Date(item.occurredAt)))).size;
}

function hasPatternSample(transactions: FinanceTransaction[]): boolean {
  return transactions.length >= MIN_PATTERN_SAMPLE && countDays(transactions) >= MIN_PATTERN_DAYS;
}

function totalsByCategory(transactions: FinanceTransaction[]): Map<string, number> {
  const totals = new Map<string, number>();
  transactions.forEach((item) => {
    if (item.categoryId)
      totals.set(item.categoryId, (totals.get(item.categoryId) ?? 0) + item.amountCents);
  });
  return totals;
}

function categoryName(categoryId: string | null | undefined, categories: Category[]): string {
  return categories.find((item) => item.id === categoryId)?.name ?? 'la categoría';
}

function standardDeviation(values: number[], mean: number): number {
  if (!values.length) return 0;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

function confidenceFor(sampleSize: number): Insight['confidence'] {
  return sampleSize >= 20 ? 'strong' : 'emerging';
}

function formatCompact(cents: number): string {
  return `S/ ${(cents / 100).toFixed(2)}`;
}

function clamp(value: unknown, minimum: number, maximum: number, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(maximum, Math.max(minimum, numeric));
}
