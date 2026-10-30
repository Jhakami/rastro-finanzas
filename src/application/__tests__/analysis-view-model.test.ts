import { analysisWindow, buildAnalysisView } from '../analysis-view-model';
import type { FinanceTransaction } from '@/domain/types';
const now = new Date(2026, 9, 29, 12);
const tx = (
  id: string,
  kind: FinanceTransaction['kind'],
  amountCents: number,
  overrides: Partial<FinanceTransaction> = {},
): FinanceTransaction => ({
  id,
  kind,
  amountCents,
  accountId: 'cash',
  occurredAt: new Date(2026, 9, 29, 10).toISOString(),
  ...overrides,
});
const view = (rows: FinanceTransaction[], account: string | null = null) =>
  buildAnalysisView(rows, 'month', account, [], [], now);
it('uses local calendar month-to-date and exactly seven days including today', () => {
  const w = analysisWindow('month', now);
  expect(w.start).toEqual(new Date(2026, 9, 1));
  expect(w.end).toEqual(new Date(2026, 9, 30));
  expect(buildAnalysisView([], '7d', null, [], [], now).daily).toHaveLength(7);
  expect(buildAnalysisView([], 'month', null, [], [], new Date(2024, 1, 29))).toHaveProperty(
    'daily.length',
    29,
  );
});
it('includes the start, excludes the end, deleted records and next-month future data', () => {
  const rows = [
    tx('start', 'expense', 100, { occurredAt: new Date(2026, 9, 1).toISOString() }),
    tx('end', 'expense', 300, { occurredAt: new Date(2026, 9, 30).toISOString() }),
    tx('deleted', 'expense', 600, { deletedAt: 'deleted' }),
    tx('future', 'expense', 1000, { occurredAt: new Date(2026, 10, 1).toISOString() }),
  ];
  expect(view(rows).expenseCents).toBe(100);
});
it('cash flow includes refunds but excludes transfers and reconciliation', () => {
  const result = view([
    tx('expense', 'expense', 9000),
    tx('income', 'income', 5000),
    tx('refund', 'refund', 1000),
    tx('transfer', 'transfer', 8000, { destinationAccountId: 'bank' }),
    tx('adjust', 'adjustment', -1000),
  ]);
  expect(result.netCents).toBe(-3000);
  expect(result.daily.at(-1)?.cumulativeCents).toBe(-3000);
  expect(result.incomeCents).toBe(6000);
  expect(result.expenses).toHaveLength(1);
});
it('account filtering includes incoming transfers in history but not cash flow', () => {
  const result = view(
    [
      tx('expense', 'expense', 100),
      tx('incoming-transfer', 'transfer', 200, { destinationAccountId: 'bank' }),
    ],
    'bank',
  );
  expect(result.rows.map((t) => t.id)).toEqual(['incoming-transfer']);
  expect(result.netCents).toBe(0);
});
it('tags are overlapping groups, with per-record deduplication and untagged fallback', () => {
  const result = view([
    tx('a', 'expense', 100, { tagIds: ['x', 'y', 'x'] }),
    tx('b', 'expense', 200),
  ]);
  expect(result.tagTotals.find((t) => t.id === 'x')?.value).toBe(100);
  expect(result.tagTotals.find((t) => t.id === 'untagged')?.value).toBe(200);
  expect(result.expenseCents).toBe(300);
  expect(result.categoryTotals[0]?.value).toBe(300);
});
it('empty periods return zero averages, not NaN, and top expenses never mutate history', () => {
  expect(view([]).recordExpenseAverageCents).toBe(0);
  const rows = [tx('a', 'expense', 100), tx('b', 'expense', 400)];
  expect(view(rows).topExpenses[0]?.id).toBe('b');
  expect(rows[0]?.id).toBe('a');
});
