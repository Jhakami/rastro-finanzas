import {
  budgetWindow,
  budgetProgress,
  budgetsOverlap,
  normalizeBudget,
  type Budget,
} from '../budgets';
import type { Category } from '../types';
const scope = { accountIds: [], categoryIds: [], tagIds: [] };
const budget: Budget = {
  id: 'b',
  name: 'Mes',
  amountCents: 10000,
  warningPercent: 80,
  period: 'monthly',
  notify: false,
  enabled: true,
  sortOrder: 0,
  scope,
};
describe('budget calendar and scope', () => {
  it('uses complete local calendar months including leap years and December', () => {
    for (const [year, month] of [
      [2024, 1],
      [2026, 11],
    ] as const) {
      const range = budgetWindow('monthly', new Date(year, month, 18, 23));
      expect(range.start).toBe(new Date(year, month, 1).toISOString());
      expect(range.end).toBe(new Date(year, month + 1, 1).toISOString());
    }
  });
  it('starts weeks on Monday even for a Sunday at a year boundary', () => {
    expect(budgetWindow('weekly', new Date(2027, 0, 3))).toEqual({
      start: new Date(2026, 11, 28).toISOString(),
      end: new Date(2027, 0, 4).toISOString(),
    });
    expect(budgetWindow('yearly', new Date(2026, 11, 31))).toEqual({
      start: new Date(2026, 0, 1).toISOString(),
      end: new Date(2027, 0, 1).toISOString(),
    });
  });
  it('distinguishes warning, exhausted and overspent with exact cents', () => {
    expect(budgetProgress(budget, 7999, 1).status).toBe('normal');
    expect(budgetProgress(budget, 8000, 1).status).toBe('warning');
    expect(budgetProgress(budget, 10000, 1)).toMatchObject({
      status: 'exceeded',
      remainingCents: 0,
    });
    expect(budgetProgress(budget, 10001, 1)).toMatchObject({
      status: 'exceeded',
      remainingCents: -1,
    });
  });
  it('recognizes parent/child overlap but disjoint accounts; tags can coexist', () => {
    const categories = [
      { id: 'food', parentId: null },
      { id: 'snack', parentId: 'food' },
      { id: 'sweet', parentId: 'snack' },
    ] as Category[];
    expect(
      budgetsOverlap(
        { ...scope, categoryIds: ['food'], tagIds: ['work'] },
        { ...scope, categoryIds: ['sweet'], tagIds: ['home'] },
        categories,
      ),
    ).toBe(true);
    expect(
      budgetsOverlap(
        { ...scope, accountIds: ['cash'] },
        { ...scope, accountIds: ['bank'] },
        categories,
      ),
    ).toBe(false);
    expect(
      budgetsOverlap(
        { ...scope, categoryIds: ['sweet'] },
        { ...scope, categoryIds: ['travel'] },
        categories,
      ),
    ).toBe(false);
  });
  it('validates money, thresholds, and deduplicates selections', () => {
    for (const amountCents of [0, -1, 1.5, Infinity])
      expect(() => normalizeBudget({ ...budget, amountCents })).toThrow();
    for (const warningPercent of [0, 121, NaN, 1.5])
      expect(() => normalizeBudget({ ...budget, warningPercent })).toThrow();
    expect(
      normalizeBudget({ ...budget, name: '  Mi  mes ', scope: { ...scope, tagIds: ['x', 'x'] } }),
    ).toMatchObject({ name: 'Mi mes', scope: { tagIds: ['x'] } });
  });
});
