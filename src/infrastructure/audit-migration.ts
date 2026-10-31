import type { SQLiteDatabase } from 'expo-sqlite';
export const AUDIT_MIGRATION_SQL = `
CREATE INDEX IF NOT EXISTS idx_audit_page ON audit_events(julianday(occurred_at) DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_deleted_page ON transactions(julianday(deleted_at) DESC,id DESC) WHERE deleted_at IS NOT NULL;
PRAGMA user_version=9;
`;
export async function migrateAudit(db: SQLiteDatabase) {
  await db.withTransactionAsync(() => db.execAsync(AUDIT_MIGRATION_SQL));
}
