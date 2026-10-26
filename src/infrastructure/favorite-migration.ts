import type { SQLiteDatabase } from 'expo-sqlite';

export async function migrateFavorites(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      ALTER TABLE favorites ADD COLUMN amount_mode TEXT NOT NULL DEFAULT 'variable';
      ALTER TABLE favorites ADD COLUMN last_used_at TEXT;
      ALTER TABLE favorites ADD COLUMN created_at TEXT;
      ALTER TABLE favorites ADD COLUMN updated_at TEXT;
      UPDATE favorites SET amount_mode=CASE WHEN amount_cents IS NULL THEN 'variable' ELSE 'suggested' END,
        created_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
      CREATE TABLE favorite_tags (
        favorite_id TEXT NOT NULL REFERENCES favorites(id) ON DELETE CASCADE,
        tag_id TEXT NOT NULL REFERENCES tags(id), PRIMARY KEY(favorite_id,tag_id)
      );
      CREATE INDEX idx_favorite_tags_tag ON favorite_tags(tag_id);
      PRAGMA user_version=6;
    `);
  });
}
