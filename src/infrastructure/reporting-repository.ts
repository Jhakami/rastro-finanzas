import { analysisWindow, type AnalysisPeriod } from '@/application/analysis-view-model';
import { getCategoryPath } from '@/domain/categories';
import type { Category, FinanceTransaction, Tag } from '@/domain/types';
import { openDatabase } from './database';
import { BALANCES_SQL, RECENT_CATEGORIES_SQL, REPORT_SQL, ZONES_SQL } from './reporting-sql';

export interface ZoneSummary {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  amount: number;
  count: number;
}
interface ReportRow {
  incomeCents: number;
  expenseCents: number;
  incomeCount: number;
  expenseCount: number;
  microExpenseCents: number;
  microCount: number;
  dailyJson: string;
  categoriesJson: string;
  tagsJson: string;
  recentJson: string;
  topJson: string;
  scatterJson: string;
}
export function reportParameters(
  period: AnalysisPeriod,
  accountId: string | null,
  threshold: number,
  now = new Date(),
) {
  const { start, end } = analysisWindow(period, now);
  const days = [];
  for (const date = new Date(start); date < end; date.setDate(date.getDate() + 1)) {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    days.push({
      label: `${date.getDate()}/${date.getMonth() + 1}`,
      from: date.toISOString(),
      until: next.toISOString(),
    });
  }
  return {
    $from: start.toISOString(),
    $until: end.toISOString(),
    $account: accountId,
    $threshold: threshold,
    $days: JSON.stringify(days),
  };
}
export function decodeReport(
  row: ReportRow,
  period: AnalysisPeriod,
  categories: Category[],
  tags: Tag[],
  now = new Date(),
) {
  const { start, end } = analysisWindow(period, now);
  let cumulative = 0;
  const daily = (
    JSON.parse(row.dailyJson) as { label: string; incomeCents: number; expenseCents: number }[]
  ).map((day) => {
    const netCents = day.incomeCents - day.expenseCents;
    cumulative += netCents;
    return { ...day, netCents, cumulativeCents: cumulative };
  });
  const groups = (json: string, mode: 'category' | 'tag') =>
    (JSON.parse(json) as { id: string; value: number }[]).map((group) => ({
      ...group,
      label:
        mode === 'category'
          ? getCategoryPath(group.id, categories)
          : (tags.find((t) => t.id === group.id)?.name ?? 'Sin etiqueta'),
      color: (mode === 'category' ? categories : tags).find((c) => c.id === group.id)?.color,
    }));
  return {
    start,
    end,
    daily,
    incomeCents: row.incomeCents,
    expenseCents: row.expenseCents,
    netCents: row.incomeCents - row.expenseCents,
    incomeCount: row.incomeCount,
    expenseCount: row.expenseCount,
    microExpenseCents: row.microExpenseCents,
    microCount: row.microCount,
    projectedExpenseCents: Math.round(
      (row.expenseCents / Math.max(1, now.getDate())) *
        new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
    ),
    rows: JSON.parse(row.recentJson) as FinanceTransaction[],
    expenses: JSON.parse(row.scatterJson) as FinanceTransaction[],
    topExpenses: JSON.parse(row.topJson) as FinanceTransaction[],
    categoryTotals: groups(row.categoriesJson, 'category'),
    tagTotals: groups(row.tagsJson, 'tag'),
    dailyExpenseAverageCents: Math.round(row.expenseCents / Math.max(1, daily.length)),
    recordExpenseAverageCents: row.expenseCount
      ? Math.round(row.expenseCents / row.expenseCount)
      : 0,
  };
}
export type AnalysisReport = ReturnType<typeof decodeReport>;
export const reportingRepository = {
  async balances() {
    const rows = await (
      await openDatabase()
    ).getAllAsync<{ id: string; balance: number }>(BALANCES_SQL);
    return Object.fromEntries(rows.map((r) => [r.id, r.balance]));
  },
  async recentCategories() {
    return (await (await openDatabase()).getAllAsync<{ id: string }>(RECENT_CATEGORIES_SQL)).map(
      (r) => r.id,
    );
  },
  async zones() {
    return (await openDatabase()).getAllAsync<ZoneSummary>(ZONES_SQL);
  },
  async report(
    period: AnalysisPeriod,
    accountId: string | null,
    threshold: number,
    categories: Category[],
    tags: Tag[],
    now = new Date(),
  ) {
    const row = await (
      await openDatabase()
    ).getFirstAsync<ReportRow>(REPORT_SQL, reportParameters(period, accountId, threshold, now));
    if (!row) throw new Error('No se pudo calcular el resumen.');
    return decodeReport(row, period, categories, tags, now);
  },
};
