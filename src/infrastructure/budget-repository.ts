import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { openDatabase, withWriteTransaction } from './database';
import type { Category } from '@/domain/types';
import {
  BudgetOverlapError,
  budgetsOverlap,
  budgetProgress,
  budgetWindow,
  normalizeBudget,
  type Budget,
  type BudgetProgress,
  type PlanningRepository,
  type SaveBudgetInput,
} from '@/domain/budgets';

const SELECT_BUDGETS = `SELECT b.id,b.name,b.amount_cents AS amountCents,b.warning_percent AS warningPercent,b.period,b.notify,b.enabled,b.sort_order AS sortOrder,
 (SELECT json_group_array(account_id) FROM budget_accounts WHERE budget_id=b.id) AS accountsJson,
 (SELECT json_group_array(category_id) FROM budget_categories WHERE budget_id=b.id) AS categoriesJson,
 (SELECT json_group_array(tag_id) FROM budget_tags WHERE budget_id=b.id) AS tagsJson
 FROM spending_limits b ORDER BY b.enabled DESC,b.sort_order,b.id`;

export const BUDGET_TOTAL_SQL = `WITH RECURSIVE selected_categories(id) AS (
 SELECT category_id FROM budget_categories WHERE budget_id=?
 UNION SELECT c.id FROM categories c JOIN selected_categories s ON c.parent_id=s.id
)
SELECT COALESCE(SUM(t.amount_cents),0) AS spentCents,COUNT(*) AS count FROM transactions t
WHERE t.kind='expense' AND t.deleted_at IS NULL
 AND julianday(t.occurred_at)>=julianday(?) AND julianday(t.occurred_at)<julianday(?)
 AND (NOT EXISTS(SELECT 1 FROM budget_accounts WHERE budget_id=?) OR EXISTS(SELECT 1 FROM budget_accounts WHERE budget_id=? AND account_id=t.account_id))
 AND (NOT EXISTS(SELECT 1 FROM budget_categories WHERE budget_id=?) OR t.category_id IN (SELECT id FROM selected_categories))
 AND (NOT EXISTS(SELECT 1 FROM budget_tags WHERE budget_id=?) OR EXISTS(SELECT 1 FROM transaction_tags tt JOIN budget_tags bt ON bt.tag_id=tt.tag_id WHERE tt.transaction_id=t.id AND bt.budget_id=?))`;

export class SQLitePlanningRepository implements PlanningRepository {
  private async read(db: SQLiteDatabase): Promise<Budget[]> {
    const rows = await db.getAllAsync<
      Omit<Budget, 'scope'> & { accountsJson: string; categoriesJson: string; tagsJson: string }
    >(SELECT_BUDGETS);
    return rows.map(({ accountsJson, categoriesJson, tagsJson, ...row }) => ({
      ...row,
      enabled: Boolean(row.enabled),
      notify: Boolean(row.notify),
      scope: {
        accountIds: JSON.parse(accountsJson) as string[],
        categoryIds: JSON.parse(categoriesJson) as string[],
        tagIds: JSON.parse(tagsJson) as string[],
      },
    }));
  }
  async list() {
    return this.read(await openDatabase());
  }
  async progress(at = new Date()): Promise<BudgetProgress[]> {
    const db = await openDatabase();
    const budgets = await this.read(db);
    const results: BudgetProgress[] = [];
    for (const budget of budgets.filter((b) => b.enabled)) {
      const { start, end } = budgetWindow(budget.period, at);
      const total = await db.getFirstAsync<{ spentCents: number; count: number }>(
        BUDGET_TOTAL_SQL,
        budget.id,
        start,
        end,
        budget.id,
        budget.id,
        budget.id,
        budget.id,
        budget.id,
      );
      results.push(budgetProgress(budget, total?.spentCents ?? 0, total?.count ?? 0, at));
    }
    return results;
  }
  private async checkOverlap(
    db: SQLiteDatabase,
    input: SaveBudgetInput,
    id: string,
    allowOverlap: boolean,
  ) {
    if (allowOverlap) return;
    const categories = await db.getAllAsync<Category>(
      'SELECT id,parent_id AS parentId FROM categories',
    );
    const overlaps = (await this.read(db)).filter(
      (b) => b.enabled && b.id !== id && budgetsOverlap(b.scope, input.scope, categories),
    );
    if (overlaps.length) throw new BudgetOverlapError(overlaps.map((b) => b.name));
  }
  private async references(db: SQLiteDatabase, input: SaveBudgetInput, previous?: Budget) {
    for (const [table, ids, old] of [
      ['accounts', input.scope.accountIds, previous?.scope.accountIds],
      ['categories', input.scope.categoryIds, previous?.scope.categoryIds],
      ['tags', input.scope.tagIds, previous?.scope.tagIds],
    ] as const) {
      for (const id of ids) {
        const row = await db.getFirstAsync<{ isArchived: number }>(
          `SELECT is_archived AS isArchived FROM ${table} WHERE id=?`,
          id,
        );
        if (!row || (row.isArchived && !old?.includes(id)))
          throw new Error(
            'Selecciona referencias activas. Las referencias archivadas existentes se pueden conservar.',
          );
      }
    }
  }
  async save(raw: SaveBudgetInput, id?: string, allowOverlap = false): Promise<string> {
    const input = normalizeBudget(raw),
      key = id ?? Crypto.randomUUID(),
      now = new Date().toISOString();
    await withWriteTransaction(async (tx) => {
      const previous = id ? (await this.read(tx)).find((b) => b.id === id) : undefined;
      if (id && !previous) throw new Error('El presupuesto ya no existe.');
      await this.references(tx, input, previous);
      if (!previous || previous.enabled) await this.checkOverlap(tx, input, key, allowOverlap);
      if (id)
        await tx.runAsync(
          `UPDATE spending_limits SET name=?,amount_cents=?,warning_percent=?,period=?,notify=?,account_id=?,category_id=?,updated_at=? WHERE id=?`,
          input.name,
          input.amountCents,
          input.warningPercent,
          input.period,
          input.notify ? 1 : 0,
          input.scope.accountIds.length === 1 ? input.scope.accountIds[0]! : null,
          input.scope.categoryIds.length === 1 ? input.scope.categoryIds[0]! : null,
          now,
          id,
        );
      else
        await tx.runAsync(
          `INSERT INTO spending_limits(id,name,amount_cents,warning_percent,period,notify,enabled,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,1,(SELECT COALESCE(MAX(sort_order),-1)+1 FROM spending_limits),?,?)`,
          key,
          input.name,
          input.amountCents,
          input.warningPercent,
          input.period,
          input.notify ? 1 : 0,
          now,
          now,
        );
      for (const [table, column, ids] of [
        ['budget_accounts', 'account_id', input.scope.accountIds],
        ['budget_categories', 'category_id', input.scope.categoryIds],
        ['budget_tags', 'tag_id', input.scope.tagIds],
      ] as const) {
        await tx.runAsync(`DELETE FROM ${table} WHERE budget_id=?`, key);
        for (const ref of ids)
          await tx.runAsync(`INSERT INTO ${table}(budget_id,${column}) VALUES(?,?)`, key, ref);
      }
      await this.audit(tx, key, previous ? 'updated' : 'created', {
        before: previous ?? null,
        after: input,
        overlapConfirmed: allowOverlap,
      });
    });
    return key;
  }
  async setEnabled(id: string, enabled: boolean, allowOverlap = false) {
    await withWriteTransaction(async (tx) => {
      const current = (await this.read(tx)).find((b) => b.id === id);
      if (!current) throw new Error('El presupuesto ya no existe.');
      if (current.enabled === enabled) return;
      if (enabled) await this.checkOverlap(tx, current, id, allowOverlap);
      await tx.runAsync(
        `UPDATE spending_limits SET enabled=?,updated_at=? WHERE id=?`,
        enabled ? 1 : 0,
        new Date().toISOString(),
        id,
      );
      await this.audit(tx, id, enabled ? 'restored' : 'archived', {
        overlapConfirmed: allowOverlap,
      });
    });
  }
  async move(id: string, direction: 'up' | 'down') {
    await withWriteTransaction(async (tx) => {
      const rows = (await this.read(tx)).filter((b) => b.enabled);
      const index = rows.findIndex((b) => b.id === id);
      const target = index + (direction === 'up' ? -1 : 1);
      const a = rows[index],
        b = rows[target];
      if (!a || !b) return;
      [rows[index], rows[target]] = [b, a];
      for (const [i, row] of rows.entries())
        await tx.runAsync(
          'UPDATE spending_limits SET sort_order=?,updated_at=? WHERE id=?',
          i,
          new Date().toISOString(),
          row.id,
        );
      await this.audit(tx, id, 'reordered', { direction });
    });
  }
  async claimAlert(id: string, start: string, level: string): Promise<boolean> {
    const db = await openDatabase();
    const result = await db.runAsync(
      'INSERT OR IGNORE INTO budget_alerts(budget_id,period_start,level) VALUES(?,?,?)',
      id,
      start,
      level,
    );
    return result.changes === 1;
  }
  async releaseAlert(id: string, start: string, level: string) {
    const db = await openDatabase();
    await db.runAsync(
      'DELETE FROM budget_alerts WHERE budget_id=? AND period_start=? AND level=?',
      id,
      start,
      level,
    );
  }
  private async audit(db: SQLiteDatabase, id: string, action: string, payload: unknown) {
    await db.runAsync(
      'INSERT INTO audit_events(id,entity_type,entity_id,action,payload,occurred_at) VALUES(?,?,?,?,?,?)',
      Crypto.randomUUID(),
      'budget',
      id,
      action,
      JSON.stringify(payload),
      new Date().toISOString(),
    );
  }
}
export const planningRepository = new SQLitePlanningRepository();
