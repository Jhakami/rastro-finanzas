import { differenceInCalendarDays, endOfMonth, getDate, startOfDay, subDays } from 'date-fns';
import type { DashboardMetrics, FinanceTransaction, Insight } from '@/domain/types';

const MIN_PATTERN_SAMPLE = 10;
const MIN_PATTERN_DAYS = 3;

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
): Insight[] {
  const expenses = transactions.filter((item) => item.kind === 'expense' && !item.deletedAt);
  const uniqueDays = new Set(expenses.map((item) => item.occurredAt.slice(0, 10))).size;
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
      },
    ];
  }

  const metrics = calculateMetrics(expenses, thresholdCents);
  const micro = expenses.filter((item) => isMicroExpense(item, thresholdCents));
  const insights: Insight[] = [];
  if (micro.length >= 3) {
    const ratio =
      metrics.expenseCents === 0
        ? 0
        : Math.round((metrics.microExpenseCents / metrics.expenseCents) * 100);
    insights.push({
      id: 'micro-accumulation',
      title: 'Compras pequeñas que se acumulan',
      summary: `${micro.length} compras representan ${ratio}% de tus gastos.`,
      evidence: `Umbral S/ ${(thresholdCents / 100).toFixed(2)}; total S/ ${(metrics.microExpenseCents / 100).toFixed(2)}.`,
      sampleSize: micro.length,
      confidence: micro.length >= 10 ? 'strong' : 'emerging',
      relatedTransactionIds: micro.map((item) => item.id),
    });
  }
  if (metrics.busiestHour !== null) {
    const related = expenses.filter(
      (item) => new Date(item.occurredAt).getHours() === metrics.busiestHour,
    );
    insights.push({
      id: 'busiest-hour',
      title: 'Hora con más compras',
      summary: `Tu mayor frecuencia aparece entre ${String(metrics.busiestHour).padStart(2, '0')}:00 y ${String(metrics.busiestHour + 1).padStart(2, '0')}:00.`,
      evidence: `${related.length} de ${expenses.length} movimientos del periodo.`,
      sampleSize: related.length,
      confidence: related.length >= 5 ? 'strong' : 'emerging',
      relatedTransactionIds: related.map((item) => item.id),
    });
  }
  return insights;
}
