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
  favoriteId?: string | null;
}

export interface SaveSpendingLimitInput {
  name: string;
  amountCents: number;
  categoryId?: string | null;
  accountId?: string | null;
  warningPercent: number;
}

export interface SaveAccountInput {
  name: string;
  color: string;
}

type AccountRow = Omit<Account, 'isDefault' | 'isArchived'> & {
  isDefault: boolean | number;
  isArchived: boolean | number;
};

export class LocalRepository {
  private async db(): Promise<SQLiteDatabase> {
    return openDatabase();
  }

  async listAccounts(includeArchived = false): Promise<Account[]> {
    const db = await this.db();
    const rows = await db.getAllAsync<AccountRow>(`
      SELECT id,name,color,initial_balance_cents AS initialBalanceCents,
        is_default AS isDefault,is_archived AS isArchived,sort_order AS sortOrder
      FROM accounts ${includeArchived ? '' : 'WHERE is_archived=0'}
      ORDER BY is_archived,sort_order,name
    `);
    return rows.map((account) => ({
      ...account,
      isDefault: Boolean(account.isDefault),
      isArchived: Boolean(account.isArchived),
    }));
  }

  async createAccount(input: SaveAccountInput): Promise<string> {
    const name = normalizeAccountName(input.name);
    const color = validateAccountColor(input.color);
    const db = await this.db();
    await ensureUniqueAccountName(db, name);
    const last = await db.getFirstAsync<{ sortOrder: number | null }>(
      'SELECT max(sort_order) AS sortOrder FROM accounts WHERE is_archived=0',
    );
    const id = `account-custom-${Crypto.randomUUID()}`;
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO accounts(id,name,color,initial_balance_cents,is_default,is_archived,sort_order)
         VALUES(?,?,?,0,0,0,?)`,
        id,
        name,
        color,
        (last?.sortOrder ?? -1) + 1,
      );
      await addAuditEvent(db, 'account', id, 'created', { name, color }, now);
    });
    return id;
  }

  async updateAccount(id: string, input: SaveAccountInput): Promise<void> {
    const name = normalizeAccountName(input.name);
    const color = validateAccountColor(input.color);
    const db = await this.db();
    const current = await db.getFirstAsync<Account>(
      `SELECT id,name,color,initial_balance_cents AS initialBalanceCents,
        is_default AS isDefault,is_archived AS isArchived,sort_order AS sortOrder
       FROM accounts WHERE id=?`,
      id,
    );
    if (!current) throw new Error('La cuenta ya no existe.');
    await ensureUniqueAccountName(db, name, id);
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      await db.runAsync('UPDATE accounts SET name=?,color=? WHERE id=?', name, color, id);
      await addAuditEvent(
        db,
        'account',
        id,
        'updated',
        { before: { name: current.name, color: current.color }, after: { name, color } },
        now,
      );
    });
  }

  async moveAccount(id: string, direction: 'up' | 'down'): Promise<void> {
    const db = await this.db();
    const accounts = await db.getAllAsync<Pick<Account, 'id' | 'isDefault' | 'sortOrder'>>(`
      SELECT id,is_default AS isDefault,sort_order AS sortOrder
      FROM accounts WHERE is_archived=0 ORDER BY sort_order,name
    `);
    const index = accounts.findIndex((account) => account.id === id);
    if (index < 0) throw new Error('La cuenta activa ya no existe.');
    if (accounts[index]?.isDefault) {
      throw new Error('Yape conserva la primera posición por ser la cuenta principal.');
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const target = accounts[targetIndex];
    const current = accounts[index];
    if (!target || !current || target.isDefault) return;
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        'UPDATE accounts SET sort_order=? WHERE id=?',
        target.sortOrder,
        current.id,
      );
      await db.runAsync(
        'UPDATE accounts SET sort_order=? WHERE id=?',
        current.sortOrder,
        target.id,
      );
      await addAuditEvent(db, 'account', id, 'reordered', { direction }, now);
    });
  }

  async setAccountArchived(id: string, archived: boolean): Promise<void> {
    const db = await this.db();
    const account = await db.getFirstAsync<
      Pick<Account, 'id' | 'name' | 'isDefault' | 'isArchived'>
    >(
      `SELECT id,name,is_default AS isDefault,is_archived AS isArchived FROM accounts WHERE id=?`,
      id,
    );
    if (!account) throw new Error('La cuenta ya no existe.');
    if (Boolean(account.isArchived) === archived) return;
    if (archived && account.isDefault) {
      throw new Error('Yape es la cuenta principal y no se puede archivar.');
    }
    if (archived) {
      const active = await db.getFirstAsync<{ total: number }>(
        'SELECT count(*) AS total FROM accounts WHERE is_archived=0',
      );
      if ((active?.total ?? 0) <= 1) throw new Error('Debe quedar al menos una cuenta activa.');
    }
    const last = archived
      ? null
      : await db.getFirstAsync<{ sortOrder: number | null }>(
          'SELECT max(sort_order) AS sortOrder FROM accounts WHERE is_archived=0',
        );
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      if (archived) {
        await db.runAsync('UPDATE accounts SET is_archived=1 WHERE id=?', id);
      } else {
        await db.runAsync(
          'UPDATE accounts SET is_archived=0,sort_order=? WHERE id=?',
          (last?.sortOrder ?? -1) + 1,
          id,
        );
      }
      await addAuditEvent(
        db,
        'account',
        id,
        archived ? 'archived' : 'restored',
        {
          name: account.name,
        },
        now,
      );
    });
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

  async deleteCustomCategory(id: string): Promise<void> {
    if (!id.startsWith('category-custom-')) {
      throw new Error('Las categorías incluidas con Rastro están protegidas y no se eliminan.');
    }
    const db = await this.db();
    const category = await db.getFirstAsync<Category>(
      `SELECT id,name,icon,color,parent_id AS parentId
       FROM categories WHERE id=? AND parent_id IS NOT NULL AND is_archived=0`,
      id,
    );
    if (!category) throw new Error('La categoría personalizada ya no existe.');

    const references = await db.getFirstAsync<{ total: number }>(
      `SELECT
        (SELECT count(*) FROM transactions WHERE category_id=? AND deleted_at IS NULL) +
        (SELECT count(*) FROM favorites WHERE category_id=? AND is_archived=0) +
        (SELECT count(*) FROM spending_limits WHERE category_id=? AND enabled=1) AS total`,
      id,
      id,
      id,
    );
    if ((references?.total ?? 0) > 0) {
      throw new Error(
        'No se puede eliminar porque está en uso. Reclasifica sus movimientos activos, favoritos o límites primero.',
      );
    }

    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      const detached = await db.getFirstAsync<{ total: number }>(
        'SELECT count(*) AS total FROM transactions WHERE category_id=? AND deleted_at IS NOT NULL',
        id,
      );
      // Deleted records remain for audit/recovery, so detach their foreign key before deleting
      // the user-created category. If restored later, they intentionally return as unclassified.
      await db.runAsync(
        `UPDATE transactions SET category_id='category-other',updated_at=?
         WHERE category_id=? AND deleted_at IS NOT NULL`,
        now,
        id,
      );
      await db.runAsync(
        `UPDATE favorites SET category_id='category-other'
         WHERE category_id=? AND is_archived=1`,
        id,
      );
      await db.runAsync(
        'UPDATE spending_limits SET category_id=NULL WHERE category_id=? AND enabled=0',
        id,
      );
      await db.runAsync('DELETE FROM categories WHERE id=?', id);
      await db.runAsync(
        'INSERT INTO audit_events(id,entity_type,entity_id,action,payload,occurred_at) VALUES(?,?,?,?,?,?)',
        Crypto.randomUUID(),
        'category',
        id,
        'deleted',
        JSON.stringify({
          name: category.name,
          parentId: category.parentId,
          detachedDeletedTransactions: detached?.total ?? 0,
        }),
        now,
      );
    });
  }

  async listFavorites(): Promise<FavoriteTemplate[]> {
    const db = await this.db();
    const adaptive = await db.getAllAsync<FavoriteTemplate>(`
      WITH expense_options AS (
        SELECT t.category_id AS categoryId,t.account_id AS accountId,c.name,
          COUNT(*) OVER (PARTITION BY t.category_id) AS usageCount,
          MAX(t.occurred_at) OVER (PARTITION BY t.category_id) AS lastUsedAt,
          ROW_NUMBER() OVER (
            PARTITION BY t.category_id ORDER BY t.occurred_at DESC,t.id DESC
          ) AS recencyRank
        FROM transactions t
        INNER JOIN categories c ON c.id=t.category_id
        INNER JOIN accounts a ON a.id=t.account_id AND a.is_archived=0
        WHERE t.kind='expense' AND t.deleted_at IS NULL AND t.category_id IS NOT NULL
      )
      SELECT 'adaptive-' || categoryId AS id,name,NULL AS amountCents,accountId,categoryId,
        NULL AS merchant,NULL AS note,usageCount
      FROM expense_options WHERE recencyRank=1
      ORDER BY usageCount DESC,lastUsedAt DESC,name
      LIMIT 3
    `);
    if (adaptive.length >= 3) return adaptive;

    const initial = await db.getAllAsync<FavoriteTemplate>(`
      SELECT f.id,f.name,f.amount_cents AS amountCents,f.account_id AS accountId,
        f.category_id AS categoryId,f.merchant,f.note,0 AS usageCount
      FROM favorites f INNER JOIN accounts a ON a.id=f.account_id
      WHERE f.is_archived=0 AND a.is_archived=0 ORDER BY f.sort_order,f.name
    `);
    const represented = new Set(adaptive.map((favorite) => favorite.categoryId));
    return [
      ...adaptive,
      ...initial.filter((favorite) => !represented.has(favorite.categoryId)),
    ].slice(0, 3);
  }

  async listLimits(): Promise<SpendingLimit[]> {
    const db = await this.db();
    return db.getAllAsync<SpendingLimit>(`
      SELECT id,name,amount_cents AS amountCents,category_id AS categoryId,
        account_id AS accountId,warning_percent AS warningPercent,enabled
      FROM spending_limits WHERE enabled=1 ORDER BY name
    `);
  }

  async saveSpendingLimit(input: SaveSpendingLimitInput): Promise<string> {
    if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
      throw new Error('El límite debe ser mayor que cero.');
    }
    const warningPercent = Math.min(120, Math.max(50, Math.round(input.warningPercent)));
    const db = await this.db();
    const existing = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM spending_limits
       WHERE enabled=1 AND category_id IS ? AND account_id IS ?`,
      input.categoryId ?? null,
      input.accountId ?? null,
    );
    const id = existing?.id ?? Crypto.randomUUID();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO spending_limits(id,name,amount_cents,category_id,account_id,warning_percent,enabled)
         VALUES(?,?,?,?,?,?,1)
         ON CONFLICT(id) DO UPDATE SET name=excluded.name,amount_cents=excluded.amount_cents,
           category_id=excluded.category_id,account_id=excluded.account_id,
           warning_percent=excluded.warning_percent,enabled=1`,
        id,
        input.name.trim() || 'Límite mensual',
        input.amountCents,
        input.categoryId ?? null,
        input.accountId ?? null,
        warningPercent,
      );
      await db.runAsync(
        'INSERT INTO audit_events(id,entity_type,entity_id,action,payload,occurred_at) VALUES(?,?,?,?,?,?)',
        Crypto.randomUUID(),
        'spending_limit',
        id,
        existing ? 'updated' : 'created',
        JSON.stringify({ amountCents: input.amountCents, warningPercent }),
        new Date().toISOString(),
      );
    });
    return id;
  }

  async disableSpendingLimit(id: string): Promise<void> {
    const db = await this.db();
    await db.withTransactionAsync(async () => {
      await db.runAsync('UPDATE spending_limits SET enabled=0 WHERE id=?', id);
      await db.runAsync(
        'INSERT INTO audit_events(id,entity_type,entity_id,action,occurred_at) VALUES(?,?,?,?,?)',
        Crypto.randomUUID(),
        'spending_limit',
        id,
        'disabled',
        new Date().toISOString(),
      );
    });
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
      if (input.favoriteId) {
        await db.runAsync(
          'UPDATE favorites SET usage_count=usage_count+1 WHERE id=? AND is_archived=0',
          input.favoriteId,
        );
      }
      await db.runAsync(
        'INSERT INTO audit_events(id,entity_type,entity_id,action,payload,occurred_at) VALUES(?,?,?,?,?,?)',
        Crypto.randomUUID(),
        'transaction',
        id,
        'created',
        JSON.stringify({ kind: input.kind, favoriteId: input.favoriteId ?? null }),
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

function normalizeAccountName(value: string): string {
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 30) {
    throw new Error('El nombre de la cuenta debe tener entre 2 y 30 caracteres.');
  }
  return name;
}

function validateAccountColor(value: string): string {
  const color = value.trim().toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(color)) throw new Error('Elige un color válido para la cuenta.');
  return color;
}

async function ensureUniqueAccountName(
  db: SQLiteDatabase,
  name: string,
  excludedId?: string,
): Promise<void> {
  const duplicate = await db.getFirstAsync<{ isArchived: boolean }>(
    `SELECT is_archived AS isArchived FROM accounts
     WHERE lower(trim(name))=lower(?) AND (? IS NULL OR id<>?)`,
    name,
    excludedId ?? null,
    excludedId ?? null,
  );
  if (duplicate) {
    throw new Error(
      duplicate.isArchived
        ? 'Ya existe una cuenta archivada con ese nombre. Restáurala para volver a usarla.'
        : 'Ya existe una cuenta activa con ese nombre.',
    );
  }
}

async function addAuditEvent(
  db: SQLiteDatabase,
  entityType: string,
  entityId: string,
  action: string,
  payload: unknown,
  occurredAt: string,
): Promise<void> {
  await db.runAsync(
    'INSERT INTO audit_events(id,entity_type,entity_id,action,payload,occurred_at) VALUES(?,?,?,?,?,?)',
    Crypto.randomUUID(),
    entityType,
    entityId,
    action,
    JSON.stringify(payload),
    occurredAt,
  );
}

export const repository = new LocalRepository();
