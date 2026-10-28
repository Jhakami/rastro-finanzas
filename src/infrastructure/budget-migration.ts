import type { SQLiteDatabase } from 'expo-sqlite';

export const BUDGET_MIGRATION_SQL = `
ALTER TABLE spending_limits ADD COLUMN period TEXT NOT NULL DEFAULT 'monthly';
ALTER TABLE spending_limits ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE spending_limits ADD COLUMN notify INTEGER NOT NULL DEFAULT 0;
ALTER TABLE spending_limits ADD COLUMN created_at TEXT;
ALTER TABLE spending_limits ADD COLUMN updated_at TEXT;
CREATE TABLE budget_accounts(budget_id TEXT NOT NULL REFERENCES spending_limits(id),account_id TEXT NOT NULL REFERENCES accounts(id),PRIMARY KEY(budget_id,account_id));
CREATE TABLE budget_categories(budget_id TEXT NOT NULL REFERENCES spending_limits(id),category_id TEXT NOT NULL REFERENCES categories(id),PRIMARY KEY(budget_id,category_id));
CREATE TABLE budget_tags(budget_id TEXT NOT NULL REFERENCES spending_limits(id),tag_id TEXT NOT NULL REFERENCES tags(id),PRIMARY KEY(budget_id,tag_id));
CREATE TABLE budget_alerts(budget_id TEXT NOT NULL REFERENCES spending_limits(id),period_start TEXT NOT NULL,level TEXT NOT NULL,PRIMARY KEY(budget_id,period_start,level));
INSERT INTO budget_accounts SELECT id,account_id FROM spending_limits WHERE account_id IS NOT NULL;
INSERT INTO budget_categories SELECT id,category_id FROM spending_limits WHERE category_id IS NOT NULL;
UPDATE spending_limits SET sort_order=(SELECT count(*) FROM spending_limits other WHERE other.name<spending_limits.name OR (other.name=spending_limits.name AND other.id<spending_limits.id)),created_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
CREATE INDEX idx_budget_categories_category ON budget_categories(category_id);
CREATE INDEX idx_budget_expenses ON transactions(julianday(occurred_at),account_id,category_id) WHERE kind='expense' AND deleted_at IS NULL;
PRAGMA user_version=7;
`;
export async function migrateBudgets(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.execAsync(BUDGET_MIGRATION_SQL);
  });
}
