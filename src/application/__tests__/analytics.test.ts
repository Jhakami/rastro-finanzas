import { buildInsights, calculateMetrics, isMicroExpense } from '../analytics';
import type { FinanceTransaction } from '@/domain/types';

const expense = (index: number, amountCents = 100): FinanceTransaction => ({
  id: `tx-${index}`,
  kind: 'expense',
  amountCents,
  accountId: 'account-yape',
  categoryId: 'food',
  occurredAt: new Date(2026, 8, 1 + (index % 4), 13).toISOString(),
});

describe('analytics', () => {
  it('clasifica microgastos por umbral y respeta excepciones', () => {
    expect(isMicroExpense(expense(1, 500), 500)).toBe(true);
    expect(isMicroExpense({ ...expense(1, 100), microOverride: false }, 500)).toBe(false);
    expect(isMicroExpense({ ...expense(1, 900), microOverride: true }, 500)).toBe(true);
  });

  it('calcula totales sin contar transferencias como ingreso o gasto', () => {
    const transfer = {
      ...expense(3, 800),
      kind: 'transfer' as const,
      destinationAccountId: 'bank',
    };
    const metrics = calculateMetrics(
      [expense(1, 100), expense(2, 700), transfer],
      500,
      new Date(2026, 8, 10),
    );
    expect(metrics.expenseCents).toBe(800);
    expect(metrics.microExpenseCents).toBe(100);
    expect(metrics.busiestHour).toBe(13);
  });

  it('no afirma patrones antes de 10 gastos en 3 días', () => {
    expect(
      buildInsights(
        Array.from({ length: 9 }, (_, index) => expense(index)),
        500,
      )[0]?.confidence,
    ).toBe('insufficient');
    const insights = buildInsights(
      Array.from({ length: 10 }, (_, index) => expense(index)),
      500,
    );
    expect(insights.some((item) => item.id === 'micro-accumulation')).toBe(true);
  });
});
