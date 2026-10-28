import type { Category } from './types';

export type BudgetPeriod = 'monthly' | 'weekly' | 'yearly';
export interface BudgetScope {
  accountIds: string[];
  categoryIds: string[];
  tagIds: string[];
}
export interface SaveBudgetInput {
  name: string;
  amountCents: number;
  warningPercent: number;
  period: BudgetPeriod;
  notify: boolean;
  scope: BudgetScope;
}
export interface Budget extends SaveBudgetInput {
  id: string;
  enabled: boolean;
  sortOrder: number;
}
export interface BudgetProgress {
  budget: Budget;
  start: string;
  end: string;
  spentCents: number;
  count: number;
  remainingCents: number;
  percentage: number;
  status: 'normal' | 'warning' | 'exceeded';
}
export interface PlanningRepository {
  list(): Promise<Budget[]>;
  progress(at?: Date): Promise<BudgetProgress[]>;
  save(input: SaveBudgetInput, id?: string, allowOverlap?: boolean): Promise<string>;
  setEnabled(id: string, enabled: boolean, allowOverlap?: boolean): Promise<void>;
  move(id: string, direction: 'up' | 'down'): Promise<void>;
}
export class BudgetOverlapError extends Error {
  constructor(public readonly names: string[]) {
    super(
      `Puede contar el mismo gasto que: ${names.join(', ')}. Los presupuestos no se suman entre sí. ¿Guardar de todas formas?`,
    );
  }
}
export function normalizeBudget(input: SaveBudgetInput): SaveBudgetInput {
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 50)
    throw new Error('El nombre debe tener entre 2 y 50 caracteres.');
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0)
    throw new Error('El monto debe ser mayor a cero con hasta dos decimales.');
  if (
    !Number.isInteger(input.warningPercent) ||
    input.warningPercent < 1 ||
    input.warningPercent > 120
  )
    throw new Error('El umbral debe ser un entero entre 1 y 120 %.');
  if (!['monthly', 'weekly', 'yearly'].includes(input.period))
    throw new Error('Elige un periodo válido.');
  return {
    ...input,
    name,
    scope: {
      accountIds: [...new Set(input.scope.accountIds)],
      categoryIds: [...new Set(input.scope.categoryIds)],
      tagIds: [...new Set(input.scope.tagIds)],
    },
  };
}
export function budgetWindow(
  period: BudgetPeriod,
  at = new Date(),
): { start: string; end: string } {
  if (!Number.isFinite(at.getTime())) throw new Error('Fecha inválida.');
  const start = new Date(at.getFullYear(), at.getMonth(), at.getDate());
  if (period === 'monthly') start.setDate(1);
  else if (period === 'yearly') {
    start.setMonth(0, 1);
  } else start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  if (period === 'monthly') end.setMonth(end.getMonth() + 1);
  else if (period === 'yearly') end.setFullYear(end.getFullYear() + 1);
  else end.setDate(end.getDate() + 7);
  return { start: start.toISOString(), end: end.toISOString() };
}
export function expandBudgetCategories(ids: string[], categories: Category[]): Set<string> {
  const result = new Set(ids);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of categories)
      if (c.parentId && result.has(c.parentId) && !result.has(c.id)) {
        result.add(c.id);
        changed = true;
      }
  }
  return result;
}
export function budgetsOverlap(a: BudgetScope, b: BudgetScope, categories: Category[]): boolean {
  const accounts =
    !a.accountIds.length ||
    !b.accountIds.length ||
    a.accountIds.some((id) => b.accountIds.includes(id));
  const ac = expandBudgetCategories(a.categoryIds, categories),
    bc = expandBudgetCategories(b.categoryIds, categories);
  const category = !ac.size || !bc.size || [...ac].some((id) => bc.has(id));
  // Different tags can coexist on the same movement, so they do not prove disjoint scopes.
  return accounts && category;
}
export function budgetProgress(
  budget: Budget,
  spentCents: number,
  count: number,
  at = new Date(),
): BudgetProgress {
  const percentage = (spentCents / budget.amountCents) * 100;
  return {
    budget,
    ...budgetWindow(budget.period, at),
    spentCents,
    count,
    remainingCents: budget.amountCents - spentCents,
    percentage,
    status:
      percentage >= 100 ? 'exceeded' : percentage >= budget.warningPercent ? 'warning' : 'normal',
  };
}
