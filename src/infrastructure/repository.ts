import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  Account,
  Category,
  FavoriteTemplate,
  FinanceTransaction,
  LocationCell,
  SpendingLimit,
  TransactionKind,
} from '@/domain/types';
import type { ApproximateCell } from '@/domain/location';
import { openDatabase } from './database';

export interface CreateTransactionInput {
  kind: TransactionKind;
  amountCents: number;
  accountId: string;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  occurredAt?: string;
  merchant?: string | null;
  note?: string | null;
  source?: string | null;
  location?: ApproximateCell | null;
  microOverride?: boolean | null;
  refundOfId?: string | null;
}

export class LocalRepository {
  private async db(): Promise<SQLiteDatabase> {
    return openDatabase();
  }

  async listAccounts(): Promise<Account[]> {
    const db = await this.db();
    return db.getAllAsync<Account>(`
      SELECT id,name,color,initial_balance_cents AS initialBalanceCents,
        is_default AS isDefault,is_archived AS isArchived,sort_order AS sortOrder
      FROM accounts WHERE is_archived=0 ORDER BY sort_order,name
    `);
  }

  async listCategories(): Promise<Category[]> {
    const db = await this.db();
    return db.getAllAsync<Category>(`
      SELECT id,name,icon,color,parent_id AS parentId,is_archived AS isArchived
      FROM categories WHERE is_archived=0 ORDER BY name
    `);
  }

  async createCategory(name: string, parentId: string): Promise<string> {
    const cleanName = name.trim().replace(/\s+/g, ' ');
    if (cleanName.length < 2 || cleanName.length > 50) {
      throw new Error('La categoría debe tener entre 2 y 50 caracteres.');
    }
    const db = await this.db();
    const parent = await db.getFirstAsync<Category>(
      `SELECT id,name,icon,color,parent_id AS parentId
       FROM categories WHERE id=? AND parent_id IS NULL AND is_archived=0`,
      parentId,
    );
    if (!parent) throw new Error('Elige una familia válida.');
    const duplicate = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM categories
       WHERE parent_id=? AND lower(trim(name))=lower(?) AND is_archived=0`,
      parentId,
      cleanName,
    );
    if (duplicate) throw new Error('Esa categoría ya existe dentro de la familia.');

    const id = `category-custom-${Crypto.randomUUID()}`;
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO categories(id,name,icon,color,parent_id)
         VALUES(?,?,?,?,?)`,
        id,
        cleanName,
        'pricetag',
        parent.color,
        parentId,
      );
      await db.runAsync(
        'INSERT INTO audit_events(id,entity_type,entity_id,action,payload,occurred_at) VALUES(?,?,?,?,?,?)',
        Crypto.randomUUID(),
        'category',
        id,
        'created',
        JSON.stringify({ name: cleanName, parentId }),
        now,
      );
    });
    return id;
  }

  async listFavorites(): Promise<FavoriteTemplate[]> {
    const db = await this.db();
    return db.getAllAsync<FavoriteTemplate>(`
      SELECT id,name,amount_cents AS amountCents,account_id AS accountId,
        category_id AS categoryId,merchant,note,usage_count AS usageCount
      FROM favorites WHERE is_archived=0 ORDER BY usage_count DESC,sort_order,name
    `);
  }

  async listLimits(): Promise<SpendingLimit[]> {
    const db = await this.db();
    return db.getAllAsync<SpendingLimit>(`
      SELECT id,name,amount_cents AS amountCents,category_id AS categoryId,
        account_id AS accountId,warning_percent AS warningPercent,enabled
      FROM spending_limits WHERE enabled=1 ORDER BY name
    `);
  }

  async listTransactions(): Promise<FinanceTransaction[]> {
    const db = await this.db();
    return db
      .getAllAsync<FinanceTransaction>(
        `
      SELECT t.id,t.kind,t.amount_cents AS amountCents,t.account_id AS accountId,
        t.destination_account_id AS destinationAccountId,t.category_id AS categoryId,
        t.occurred_at AS occurredAt,t.merchant,t.note,t.source,
        t.location_cell_id AS locationCellId,t.micro_override AS microOverride,
        t.refund_of_id AS refundOfId,t.deleted_at AS deletedAt,
        CASE WHEN l.id IS NULL THEN NULL ELSE json_object(
          'id',l.id,'centerLatitude',l.center_latitude,
          'centerLongitude',l.center_longitude,'label',l.label) END AS locationJson
      FROM transactions t LEFT JOIN location_cells l ON l.id=t.location_cell_id
      WHERE t.deleted_at IS NULL ORDER BY t.occurred_at DESC
    `,
      )
      .then((rows) =>
        rows.map((row) => {
          const raw = row as FinanceTransaction & { locationJson?: string | null };
          return {
            ...row,
            location: raw.locationJson ? (JSON.parse(raw.locationJson) as LocationCell) : null,
          };
        }),
      );
  }

  async createTransaction(input: CreateTransactionInput): Promise<string> {
    validateTransaction(input);
    const db = await this.db();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      if (input.location) {
        await db.runAsync(
          `INSERT OR IGNORE INTO location_cells(id,center_latitude,center_longitude)
           VALUES(?,?,?)`,
          input.location.id,
          input.location.centerLatitude,
          input.location.centerLongitude,
        );
      }
      await db.runAsync(
        `INSERT INTO transactions(
          id,kind,amount_cents,account_id,destination_account_id,category_id,occurred_at,
          merchant,note,source,location_cell_id,micro_override,refund_of_id,created_at,updated_at
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        id,
        input.kind,
        input.amountCents,
        input.accountId,
        input.destinationAccountId ?? null,
        input.categoryId ?? null,
        input.occurredAt ?? now,
        input.merchant ?? null,
        input.note ?? null,
        input.source ?? null,
        input.location?.id ?? null,
        input.microOverride === undefined || input.microOverride === null
          ? null
          : Number(input.microOverride),
        input.refundOfId ?? null,
        now,
        now,
      );
      await db.runAsync(
        'INSERT INTO audit_events(id,entity_type,entity_id,action,payload,occurred_at) VALUES(?,?,?,?,?,?)',
        Crypto.randomUUID(),
        'transaction',
        id,
        'created',
        JSON.stringify({ kind: input.kind }),
        now,
      );
    });
    return id;
  }

  async softDeleteTransaction(id: string): Promise<void> {
    const db = await this.db();
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        'UPDATE transactions SET deleted_at=?,updated_at=? WHERE id=?',
        now,
        now,
        id,
      );
      await db.runAsync(
        'INSERT INTO audit_events(id,entity_type,entity_id,action,occurred_at) VALUES(?,?,?,?,?)',
        Crypto.randomUUID(),
        'transaction',
        id,
        'deleted',
        now,
      );
    });
  }

  async getSetting(key: string, fallback: string): Promise<string> {
    const db = await this.db();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key=?',
      key,
    );
    return row?.value ?? fallback;
  }

  async setSetting(key: string, value: string): Promise<void> {
    const db = await this.db();
    await db.runAsync(
      'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
      key,
      value,
    );
  }

  async setLocationLabel(id: string, label: string): Promise<void> {
    const db = await this.db();
    await db.runAsync('UPDATE location_cells SET label=? WHERE id=?', label.trim() || null, id);
  }
}

function validateTransaction(input: CreateTransactionInput): void {
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents === 0) {
    throw new Error('El monto debe ser un entero distinto de cero.');
  }
  if (input.kind !== 'adjustment' && input.amountCents < 0) {
    throw new Error('Solo un ajuste puede tener monto negativo.');
  }
  if (
    input.kind === 'transfer' &&
    (!input.destinationAccountId || input.destinationAccountId === input.accountId)
  ) {
    throw new Error('Una transferencia necesita una cuenta de destino diferente.');
  }
  if (input.kind === 'refund' && !input.refundOfId) {
    throw new Error('Un reembolso debe vincularse al gasto original.');
  }
}

export const repository = new LocalRepository();
