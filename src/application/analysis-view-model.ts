import type { Category, FinanceTransaction, Tag } from '@/domain/types';
import { getCategoryPath } from '@/domain/categories';

export type AnalysisPeriod = 'month' | '7d' | '14d' | '30d';
export function analysisWindow(period: AnalysisPeriod, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  if (period === 'month') start.setDate(1);
  else start.setDate(start.getDate() - (period === '7d' ? 6 : period === '14d' ? 13 : 29));
  return { start, end };
}
export function buildAnalysisView(
  transactions: FinanceTransaction[],
  period: AnalysisPeriod,
  accountId: string | null,
  categories: Category[],
  tags: Tag[],
  now = new Date(),
) {
  const { start, end } = analysisWindow(period, now);
  const rows = transactions
    .filter((t) => {
      const date = new Date(t.occurredAt).getTime();
      return (
        !t.deletedAt &&
        date >= start.getTime() &&
        date < end.getTime() &&
        (!accountId ||
          t.accountId === accountId ||
          (t.kind === 'transfer' && t.destinationAccountId === accountId))
      );
    })
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime() ||
        b.id.localeCompare(a.id),
    );
  const expenses = rows.filter((t) => t.kind === 'expense');
  const incoming = rows.filter((t) => t.kind === 'income' || t.kind === 'refund');
  const expenseCents = expenses.reduce((sum, t) => sum + t.amountCents, 0);
  const incomeCents = incoming.reduce((sum, t) => sum + t.amountCents, 0);
  const daily: {
    label: string;
    incomeCents: number;
    expenseCents: number;
    netCents: number;
    cumulativeCents: number;
  }[] = [];
  let cumulative = 0;
  for (const day = new Date(start); day < end; day.setDate(day.getDate() + 1)) {
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const inDay = rows.filter(
      (t) => new Date(t.occurredAt) >= day && new Date(t.occurredAt) < next,
    );
    const income = inDay
      .filter((t) => t.kind === 'income' || t.kind === 'refund')
      .reduce((sum, t) => sum + t.amountCents, 0);
    const expense = inDay
      .filter((t) => t.kind === 'expense')
      .reduce((sum, t) => sum + t.amountCents, 0);
    cumulative += income - expense;
    daily.push({
      label: `${day.getDate()}/${day.getMonth() + 1}`,
      incomeCents: income,
      expenseCents: expense,
      netCents: income - expense,
      cumulativeCents: cumulative,
    });
  }
  function grouped(mode: 'category' | 'tag') {
    const totals = new Map<string, number>();
    for (const t of expenses) {
      const keys =
        mode === 'category'
          ? [t.categoryId ?? 'unclassified']
          : [...new Set(t.tagIds?.length ? t.tagIds : ['untagged'])];
      for (const id of keys) totals.set(id, (totals.get(id) ?? 0) + t.amountCents);
    }
    return [...totals]
      .map(([id, value]) => {
        const entry =
          mode === 'category' ? categories.find((c) => c.id === id) : tags.find((t) => t.id === id);
        return {
          id,
          value,
          label:
            mode === 'category' ? getCategoryPath(id, categories) : (entry?.name ?? 'Sin etiqueta'),
          color: entry?.color,
        };
      })
      .sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));
  }
  return {
    start,
    end,
    rows,
    expenses,
    incoming,
    incomeCents,
    expenseCents,
    netCents: incomeCents - expenseCents,
    daily,
    categoryTotals: grouped('category'),
    tagTotals: grouped('tag'),
    topExpenses: [...expenses]
      .sort((a, b) => b.amountCents - a.amountCents || a.id.localeCompare(b.id))
      .slice(0, 5),
    dailyExpenseAverageCents: Math.round(expenseCents / daily.length),
    recordExpenseAverageCents: expenses.length ? Math.round(expenseCents / expenses.length) : 0,
  };
}
