import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const DATABASE_NAME = 'rastro.db';
const DATABASE_KEY_NAME = 'rastro.database.key.v1';
let databasePromise: Promise<SQLite.SQLiteDatabase> | undefined;

export async function getDatabaseKey(): Promise<string> {
  const current = await SecureStore.getItemAsync(DATABASE_KEY_NAME);
  if (current) return current;
  const bytes = await Crypto.getRandomBytesAsync(32);
  const key = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(DATABASE_KEY_NAME, key, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return key;
}

export function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  databasePromise ??= initializeDatabase();
  return databasePromise;
}

async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  const key = await getDatabaseKey();
  const sqlite = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await sqlite.execAsync(`PRAGMA key = "x'${key}'";`);
  await sqlite.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  await migrate(sqlite);
  await seed(sqlite);
  // Instantiate the typed Drizzle adapter here; repositories can adopt typed queries incrementally.
  drizzle(sqlite, { schema });
  return sqlite;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((result?.user_version ?? 0) >= 1) return;
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, color TEXT NOT NULL,
      initial_balance_cents INTEGER NOT NULL DEFAULT 0,
      is_default INTEGER NOT NULL DEFAULT 0, is_archived INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, icon TEXT NOT NULL, color TEXT NOT NULL,
      parent_id TEXT, is_archived INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(parent_id) REFERENCES categories(id)
    );
    CREATE TABLE IF NOT EXISTS location_cells (
      id TEXT PRIMARY KEY NOT NULL, center_latitude REAL NOT NULL,
      center_longitude REAL NOT NULL, label TEXT
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL, kind TEXT NOT NULL,
      amount_cents INTEGER NOT NULL CHECK(amount_cents != 0),
      account_id TEXT NOT NULL, destination_account_id TEXT, category_id TEXT,
      occurred_at TEXT NOT NULL, merchant TEXT, note TEXT, source TEXT,
      location_cell_id TEXT, micro_override INTEGER, refund_of_id TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT,
      FOREIGN KEY(account_id) REFERENCES accounts(id),
      FOREIGN KEY(destination_account_id) REFERENCES accounts(id),
      FOREIGN KEY(category_id) REFERENCES categories(id),
      FOREIGN KEY(location_cell_id) REFERENCES location_cells(id),
      FOREIGN KEY(refund_of_id) REFERENCES transactions(id)
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_occurred ON transactions(occurred_at);
    CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, amount_cents INTEGER,
      account_id TEXT NOT NULL, category_id TEXT NOT NULL, merchant TEXT, note TEXT,
      usage_count INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(account_id) REFERENCES accounts(id),
      FOREIGN KEY(category_id) REFERENCES categories(id)
    );
    CREATE TABLE IF NOT EXISTS spending_limits (
      id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, amount_cents INTEGER NOT NULL,
      category_id TEXT, account_id TEXT, warning_percent INTEGER NOT NULL DEFAULT 80,
      enabled INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY(account_id) REFERENCES accounts(id),
      FOREIGN KEY(category_id) REFERENCES categories(id)
    );
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
      action TEXT NOT NULL, payload TEXT, occurred_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
    PRAGMA user_version = 1;
  `);
}

async function seed(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    const accounts = [
      ['account-yape', 'Yape', '#742284', 1, 0],
      ['account-bank', 'Banco', '#2E5E8C', 0, 1],
      ['account-cash', 'Efectivo', '#477A43', 0, 2],
    ] as const;
    for (const item of accounts) {
      await db.runAsync(
        'INSERT OR IGNORE INTO accounts(id,name,color,is_default,sort_order) VALUES(?,?,?,?,?)',
        ...item,
      );
    }
    const categories = [
      ['category-food', 'Comida', 'restaurant', '#D96C4A'],
      ['category-transport', 'Transporte', 'bus', '#397B8C'],
      ['category-games', 'Juegos', 'game-controller', '#7357A6'],
      ['category-health', 'Salud', 'medkit', '#3C8C6A'],
      ['category-services', 'Servicios', 'receipt', '#B37A25'],
      ['category-other', 'Otros', 'ellipsis-horizontal', '#747A74'],
    ] as const;
    for (const item of categories) {
      await db.runAsync(
        'INSERT OR IGNORE INTO categories(id,name,icon,color) VALUES(?,?,?,?)',
        ...item,
      );
    }
    const favorites = [
      ['favorite-water', 'Agua', 100, 'account-yape', 'category-food', 0],
      ['favorite-pasaje', 'Pasaje', null, 'account-yape', 'category-transport', 1],
      ['favorite-snack', 'Algo rápido', null, 'account-yape', 'category-food', 2],
    ] as const;
    for (const item of favorites) {
      await db.runAsync(
        'INSERT OR IGNORE INTO favorites(id,name,amount_cents,account_id,category_id,sort_order) VALUES(?,?,?,?,?,?)',
        ...item,
      );
    }
    await db.runAsync(
      "INSERT OR IGNORE INTO settings(key,value) VALUES('microThresholdCents','500')",
    );
    await db.runAsync(
      "INSERT OR IGNORE INTO settings(key,value) VALUES('biometricEnabled','false')",
    );
  });
}
