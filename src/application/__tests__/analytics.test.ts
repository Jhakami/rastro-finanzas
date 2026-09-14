import {
  buildDailyExpenseTrend,
  buildInsights,
  calculateMetrics,
  isMicroExpense,
  normalizeBehaviorSettings,
} from '../analytics';
import type { FinanceTransaction, SpendingLimit } from '@/domain/types';

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

  it('construye una tendencia diaria completa sin inventar gasto en días vacíos', () => {
    const trend = buildDailyExpenseTrend(
      [expense(1, 250), { ...expense(2, 150), occurredAt: new Date(2026, 8, 9, 22).toISOString() }],
      3,
      new Date(2026, 8, 10, 12),
    );
    expect(trend.map((point) => point.dateKey)).toEqual(['2026-09-08', '2026-09-09', '2026-09-10']);
    expect(trend.map((point) => point.amountCents)).toEqual([0, 150, 0]);
    expect(trend.map((point) => point.count)).toEqual([0, 1, 0]);
  });

  it('normaliza parámetros fuera de rango antes de analizar', () => {
    expect(
      normalizeBehaviorSettings({
        historyMonths: 99,
        elevatedPercent: -4,
        outlierStandardDeviations: 30,
        growthMonths: 1,
        shareIncreasePoints: 200,
      }),
    ).toEqual({
      historyMonths: 3,
      elevatedPercent: 5,
      outlierStandardDeviations: 4,
      growthMonths: 2,
      shareIncreasePoints: 50,
    });
  });

  it('detecta aumento contra promedio y un gasto atípico con muestra histórica suficiente', () => {
    const history = Array.from({ length: 12 }, (_, index) => ({
      ...expense(index, 1000 + (index % 3) * 100),
      occurredAt: new Date(2026, 5 + (index % 3), 2 + (index % 4), 12).toISOString(),
    }));
    const current = [
      { ...expense(20, 10000), occurredAt: new Date(2026, 8, 2, 12).toISOString() },
      { ...expense(21, 2000), occurredAt: new Date(2026, 8, 3, 12).toISOString() },
    ];
    const insights = buildInsights([...history, ...current], 500, {
      now: new Date(2026, 8, 10),
    });
    expect(insights.some((item) => item.id.startsWith('historical-increase-food'))).toBe(true);
    expect(insights.some((item) => item.id === 'outlier-tx-20')).toBe(true);
  });

  it('detecta racha mensual y cambio de participación por categoría', () => {
    const growing = [100, 200, 300, 500].flatMap((amount, monthIndex) =>
      Array.from({ length: 3 }, (_, day) => ({
        ...expense(monthIndex * 3 + day, amount),
        categoryId: 'gaming',
        occurredAt: new Date(2026, 5 + monthIndex, day + 1, 14).toISOString(),
      })),
    );
    const comparison = [
      ...Array.from({ length: 8 }, (_, index) => ({
        ...expense(40 + index, 500),
        categoryId: 'food',
        occurredAt: new Date(2026, 7, 1 + (index % 4), 10).toISOString(),
      })),
      ...Array.from({ length: 8 }, (_, index) => ({
        ...expense(60 + index, 500),
        categoryId: index < 6 ? 'gaming' : 'food',
        occurredAt: new Date(2026, 8, 1 + (index % 4), 10).toISOString(),
      })),
    ];
    const insights = buildInsights([...growing, ...comparison], 50, {
      now: new Date(2026, 8, 10),
      settings: {
        historyMonths: 3,
        elevatedPercent: 20,
        outlierStandardDeviations: 2,
        growthMonths: 3,
        shareIncreasePoints: 10,
      },
    });
    expect(insights.some((item) => item.id === 'growth-streak-gaming')).toBe(true);
    expect(insights.some((item) => item.id === 'share-change-gaming')).toBe(true);
  });

  it('avisa por proyección y por límite mensual configurado', () => {
    const currentExpenses = Array.from({ length: 10 }, (_, index) => ({
      ...expense(index, 1200),
      occurredAt: new Date(2026, 8, 1 + (index % 4), 13).toISOString(),
    }));
    const income: FinanceTransaction = {
      ...expense(30, 5000),
      kind: 'income',
      source: 'Padres',
      occurredAt: new Date(2026, 8, 1, 9).toISOString(),
    };
    const limit: SpendingLimit = {
      id: 'limit-food',
      name: 'Alimentación',
      amountCents: 10000,
      categoryId: 'family-food',
      warningPercent: 80,
      enabled: true,
    };
    const insights = buildInsights([...currentExpenses, income], 500, {
      now: new Date(2026, 8, 10),
      limits: [limit],
      categories: [
        { id: 'family-food', name: 'Alimentación', icon: 'food', color: '#fff' },
        {
          id: 'food',
          name: 'Menú',
          icon: 'food',
          color: '#fff',
          parentId: 'family-food',
        },
      ],
    });
    expect(insights.some((item) => item.id === 'projection-over-received')).toBe(true);
    expect(insights.some((item) => item.id === 'limit-limit-food')).toBe(true);
  });
});
