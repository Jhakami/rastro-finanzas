import type { SQLiteDatabase } from 'expo-sqlite';

export const LEDGER_MIGRATION_SQL = `
CREATE INDEX IF NOT EXISTS idx_ledger_page ON transactions(julianday(occurred_at) DESC,id DESC) WHERE deleted_at IS NULL;
PRAGMA user_version=8;
`;
export async function migrateLedger(db: SQLiteDatabase) {
  await db.withTransactionAsync(() => db.execAsync(LEDGER_MIGRATION_SQL));
}
