import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { openDatabase } from './database';
import {
  normalizeFavorite,
  type FavoriteRepository,
  type FavoriteOrder,
  type ManualFavorite,
  type SaveFavoriteInput,
} from '@/domain/favorites';

export class SQLiteFavoriteRepository implements FavoriteRepository {
  async list(order: FavoriteOrder = 'manual'): Promise<ManualFavorite[]> {
    const db = await openDatabase();
    const orders = {
      manual: 'f.sort_order,f.id',
      recent: 'f.last_used_at DESC,f.sort_order,f.id',
      frequency: 'f.usage_count DESC,f.last_used_at DESC,f.sort_order,f.id',
    };
    const rows = await db.getAllAsync<Omit<ManualFavorite, 'tagIds'> & { tagJson: string }>(`
      SELECT f.id,f.name,f.account_id AS accountId,f.category_id AS categoryId,
        f.amount_cents AS amountCents,f.amount_mode AS amountMode,f.merchant,f.note,
        f.usage_count AS usageCount,f.sort_order AS sortOrder,f.is_archived AS isArchived,
        f.last_used_at AS lastUsedAt,(a.is_archived=0 AND c.is_archived=0) AS available,
        (SELECT json_group_array(tag_id) FROM favorite_tags WHERE favorite_id=f.id) AS tagJson
      FROM favorites f JOIN accounts a ON a.id=f.account_id JOIN categories c ON c.id=f.category_id
      ORDER BY f.is_archived,${orders[order]}`);
    return rows.map(({ tagJson, ...row }) => ({
      ...row,
      isArchived: Boolean(row.isArchived),
      available: Boolean(row.available),
      tagIds: JSON.parse(tagJson) as string[],
    }));
  }

  async save(raw: SaveFavoriteInput, id?: string): Promise<string> {
    const input = normalizeFavorite(raw);
    const db = await openDatabase();
    const favoriteId = id ?? Crypto.randomUUID();
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      const before = id ? await db.getFirstAsync('SELECT * FROM favorites WHERE id=?', id) : null;
      if (id && !before) throw new Error('El favorito ya no existe.');
      await this.validateReferences(db, input);
      if (id) {
        await db.runAsync(
          `UPDATE favorites SET name=?,account_id=?,category_id=?,amount_cents=?,amount_mode=?,merchant=?,note=?,updated_at=? WHERE id=?`,
          input.name,
          input.accountId,
          input.categoryId,
          input.amountCents,
          input.amountMode,
          input.merchant,
          input.note,
          now,
          id,
        );
      } else {
        await db.runAsync(
          `INSERT INTO favorites(id,name,account_id,category_id,amount_cents,amount_mode,merchant,note,sort_order,created_at,updated_at)
          VALUES(?,?,?,?,?,?,?,?,(SELECT COALESCE(MAX(sort_order),-1)+1 FROM favorites),?,?)`,
          favoriteId,
          input.name,
          input.accountId,
          input.categoryId,
          input.amountCents,
          input.amountMode,
          input.merchant,
          input.note,
          now,
          now,
        );
      }
      await db.runAsync('DELETE FROM favorite_tags WHERE favorite_id=?', favoriteId);
      for (const tagId of input.tagIds)
        await db.runAsync(
          'INSERT INTO favorite_tags(favorite_id,tag_id) VALUES(?,?)',
          favoriteId,
          tagId,
        );
      await this.audit(db, favoriteId, id ? 'updated' : 'created', { before, after: input });
    });
    return favoriteId;
  }

  private async validateReferences(db: SQLiteDatabase, input: SaveFavoriteInput) {
    const account = await db.getFirstAsync(
      'SELECT id FROM accounts WHERE id=? AND is_archived=0',
      input.accountId,
    );
    const category = await db.getFirstAsync(
      `SELECT id FROM categories c WHERE id=? AND is_archived=0 AND NOT EXISTS(SELECT 1 FROM categories child WHERE child.parent_id=c.id AND child.is_archived=0)`,
      input.categoryId,
    );
    if (!account || !category)
      throw new Error('Elige una cuenta activa y una categoría específica activa.');
    for (const tagId of input.tagIds) {
      if (!(await db.getFirstAsync('SELECT id FROM tags WHERE id=? AND is_archived=0', tagId)))
        throw new Error('Elige únicamente etiquetas activas.');
    }
  }

  async move(id: string, direction: 'up' | 'down'): Promise<void> {
    const db = await openDatabase();
    await db.withTransactionAsync(async () => {
      const rows = await db.getAllAsync<{ id: string }>(
        'SELECT id FROM favorites WHERE is_archived=0 ORDER BY sort_order,id',
      );
      const index = rows.findIndex((row) => row.id === id);
      const target = index + (direction === 'up' ? -1 : 1);
      if (index < 0 || target < 0 || target >= rows.length) return;
      const current = rows[index];
      const neighbor = rows[target];
      if (!current || !neighbor) return;
      [rows[index], rows[target]] = [neighbor, current];
      const now = new Date().toISOString();
      for (let i = 0; i < rows.length; i++)
        await db.runAsync(
          'UPDATE favorites SET sort_order=?,updated_at=? WHERE id=?',
          i,
          now,
          rows[i]!.id,
        );
      await this.audit(db, id, 'reordered', { direction });
    });
  }

  async setArchived(id: string, archived: boolean): Promise<void> {
    const db = await openDatabase();
    await db.withTransactionAsync(async () => {
      const current = await db.getFirstAsync<{ isArchived: number }>(
        'SELECT is_archived AS isArchived FROM favorites WHERE id=?',
        id,
      );
      if (!current) throw new Error('El favorito ya no existe.');
      if (Boolean(current.isArchived) === archived) return;
      await db.runAsync(
        `UPDATE favorites SET is_archived=?,updated_at=?,sort_order=CASE WHEN ?=0 THEN (SELECT COALESCE(MAX(sort_order),-1)+1 FROM favorites) ELSE sort_order END WHERE id=?`,
        archived ? 1 : 0,
        new Date().toISOString(),
        archived ? 1 : 0,
        id,
      );
      await this.audit(db, id, archived ? 'archived' : 'restored', null);
    });
  }

  private async audit(db: SQLiteDatabase, id: string, action: string, payload: unknown) {
    await db.runAsync(
      'INSERT INTO audit_events(id,entity_type,entity_id,action,payload,occurred_at) VALUES(?,?,?,?,?,?)',
      Crypto.randomUUID(),
      'favorite',
      id,
      action,
      JSON.stringify(payload),
      new Date().toISOString(),
    );
  }
}
export const favoriteRepository: FavoriteRepository = new SQLiteFavoriteRepository();
