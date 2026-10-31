import * as Crypto from 'expo-crypto';
import type { AuditCursor, AuditEntry, AuditPage, AuditRepository } from '@/domain/audit';
import { openDatabase, withWriteTransaction } from './database';

export const AUDIT_PAGE_SQL = `SELECT id,entity_type AS entityType,entity_id AS entityId,
 action,payload,occurred_at AS occurredAt FROM audit_events
 WHERE ($date IS NULL OR julianday(occurred_at)<julianday($date)
 OR (julianday(occurred_at)=julianday($date) AND id<$id))
 ORDER BY julianday(occurred_at) DESC,id DESC LIMIT 51`;

export class SQLiteAuditRepository implements AuditRepository {
  async page(cursor?: AuditCursor | null): Promise<AuditPage> {
    if (cursor && (!cursor.id || !Number.isFinite(Date.parse(cursor.occurredAt)))) {
      throw new Error('Cursor de auditoría inválido.');
    }
    const rows = await (
      await openDatabase()
    ).getAllAsync<AuditEntry>(AUDIT_PAGE_SQL, {
      $date: cursor?.occurredAt ?? null,
      $id: cursor?.id ?? null,
    });
    const items = rows.slice(0, 50);
    const last = items.at(-1);
    return {
      items,
      nextCursor: rows.length > 50 && last ? { occurredAt: last.occurredAt, id: last.id } : null,
    };
  }

  async restoreTransaction(id: string, reason: string): Promise<boolean> {
    const normalizedReason = reason.trim();
    if (!id.trim() || !normalizedReason) {
      throw new Error('Indica el movimiento y el motivo de restauración.');
    }
    // BEGIN IMMEDIATE on an isolated SQLCipher connection serializes repeated confirmations.
    return withWriteTransaction(async (db) => {
      const existing = await db.getFirstAsync<{ deletedAt: string | null }>(
        'SELECT deleted_at AS deletedAt FROM transactions WHERE id=?',
        id,
      );
      if (!existing) throw new Error('El movimiento ya no existe.');
      if (existing.deletedAt === null) return false;
      const now = new Date().toISOString();
      const result = await db.runAsync(
        'UPDATE transactions SET deleted_at=NULL,updated_at=? WHERE id=? AND deleted_at IS NOT NULL',
        now,
        id,
      );
      if (result.changes !== 1) throw new Error('No se pudo restaurar el movimiento.');
      await db.runAsync(
        'INSERT INTO audit_events(id,entity_type,entity_id,action,payload,occurred_at) VALUES(?,?,?,?,?,?)',
        Crypto.randomUUID(),
        'transaction',
        id,
        'restored',
        JSON.stringify({ reason: normalizedReason, deletedAt: existing.deletedAt }),
        now,
      );
      // Amount, account, tags, location and identity remain unchanged, even if archived.
      return true;
    });
  }
}

export const auditRepository: AuditRepository = new SQLiteAuditRepository();
