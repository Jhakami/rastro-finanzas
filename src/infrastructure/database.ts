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
  const version = result?.user_version ?? 0;
  if (version < 1) {
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
  if (version < 2) {
    await migrateCategoryCatalog(db);
  }
}

type CategorySeed = readonly [
  id: string,
  name: string,
  icon: string,
  color: string,
  parentId: string | null,
];

const CATEGORY_CATALOG: readonly CategorySeed[] = [
  ['category-food', 'Alimentación', 'restaurant', '#D96C4A', null],
  ['category-food-water', 'Agua', 'water', '#D96C4A', 'category-food'],
  ['category-food-breakfast', 'Desayuno', 'cafe', '#D96C4A', 'category-food'],
  ['category-food-lunch', 'Menú o almuerzo', 'restaurant', '#D96C4A', 'category-food'],
  ['category-food-dinner', 'Cena', 'restaurant-outline', '#D96C4A', 'category-food'],
  ['category-food-snack', 'Snack o antojo', 'fast-food', '#D96C4A', 'category-food'],
  ['category-food-bakery', 'Panadería', 'nutrition', '#D96C4A', 'category-food'],
  ['category-food-fruit', 'Frutas', 'nutrition-outline', '#D96C4A', 'category-food'],
  ['category-food-sweets', 'Dulces y postres', 'ice-cream', '#D96C4A', 'category-food'],
  ['category-food-fast', 'Comida rápida', 'fast-food-outline', '#D96C4A', 'category-food'],
  ['category-food-restaurant', 'Restaurante', 'restaurant-outline', '#D96C4A', 'category-food'],
  ['category-food-groceries', 'Mercado o supermercado', 'basket', '#D96C4A', 'category-food'],
  ['category-food-delivery', 'Delivery de comida', 'bicycle', '#D96C4A', 'category-food'],
  ['category-food-coffee', 'Café o infusión', 'cafe-outline', '#D96C4A', 'category-food'],
  ['category-food-drinks', 'Gaseosa o bebida', 'beer', '#D96C4A', 'category-food'],

  ['category-transport', 'Transporte', 'bus', '#397B8C', null],
  ['category-transport-public', 'Pasaje urbano', 'bus-outline', '#397B8C', 'category-transport'],
  ['category-transport-train', 'Metro o tren', 'train', '#397B8C', 'category-transport'],
  ['category-transport-taxi', 'Taxi o aplicativo', 'car', '#397B8C', 'category-transport'],
  ['category-transport-mototaxi', 'Mototaxi', 'bicycle-outline', '#397B8C', 'category-transport'],
  ['category-transport-intercity', 'Viaje interprovincial', 'bus', '#397B8C', 'category-transport'],
  ['category-transport-fuel', 'Combustible', 'speedometer', '#397B8C', 'category-transport'],
  ['category-transport-parking', 'Estacionamiento', 'car-sport', '#397B8C', 'category-transport'],
  ['category-transport-toll', 'Peaje', 'trail-sign', '#397B8C', 'category-transport'],
  [
    'category-transport-maintenance',
    'Mantenimiento vehicular',
    'construct',
    '#397B8C',
    'category-transport',
  ],

  ['category-home', 'Vivienda y hogar', 'home', '#8A6845', null],
  ['category-home-rent', 'Alquiler', 'key', '#8A6845', 'category-home'],
  ['category-home-repair', 'Reparación del hogar', 'hammer', '#8A6845', 'category-home'],
  ['category-home-furniture', 'Muebles', 'bed', '#8A6845', 'category-home'],
  ['category-home-cleaning', 'Productos de limpieza', 'sparkles', '#8A6845', 'category-home'],
  ['category-home-utensils', 'Utensilios del hogar', 'home-outline', '#8A6845', 'category-home'],
  ['category-home-gas', 'Gas doméstico', 'flame', '#8A6845', 'category-home'],
  ['category-home-decoration', 'Decoración', 'color-palette', '#8A6845', 'category-home'],

  ['category-services', 'Servicios y suscripciones', 'receipt', '#B37A25', null],
  ['category-services-electricity', 'Electricidad', 'flash', '#B37A25', 'category-services'],
  ['category-services-water', 'Agua del hogar', 'water-outline', '#B37A25', 'category-services'],
  ['category-services-internet', 'Internet', 'wifi', '#B37A25', 'category-services'],
  [
    'category-services-phone',
    'Telefonía o recarga',
    'phone-portrait',
    '#B37A25',
    'category-services',
  ],
  [
    'category-services-streaming',
    'Streaming de video',
    'play-circle',
    '#B37A25',
    'category-services',
  ],
  [
    'category-services-music',
    'Streaming de música',
    'musical-notes',
    '#B37A25',
    'category-services',
  ],
  ['category-services-cloud', 'Nube o almacenamiento', 'cloud', '#B37A25', 'category-services'],
  ['category-services-bank-fee', 'Comisión bancaria', 'card', '#B37A25', 'category-services'],
  [
    'category-services-paperwork',
    'Trámite o documento',
    'document-text',
    '#B37A25',
    'category-services',
  ],

  ['category-health', 'Salud', 'medkit', '#3C8C6A', null],
  ['category-health-medicine', 'Medicinas', 'medical', '#3C8C6A', 'category-health'],
  [
    'category-health-consultation',
    'Consulta médica',
    'medkit-outline',
    '#3C8C6A',
    'category-health',
  ],
  ['category-health-tests', 'Análisis o examen', 'flask', '#3C8C6A', 'category-health'],
  ['category-health-dental', 'Salud dental', 'happy', '#3C8C6A', 'category-health'],
  ['category-health-vision', 'Vista y lentes', 'eye', '#3C8C6A', 'category-health'],
  ['category-health-therapy', 'Terapia o rehabilitación', 'fitness', '#3C8C6A', 'category-health'],
  [
    'category-health-insurance',
    'Seguro de salud',
    'shield-checkmark',
    '#3C8C6A',
    'category-health',
  ],
  ['category-health-emergency', 'Emergencia médica', 'alert-circle', '#3C8C6A', 'category-health'],

  ['category-education', 'Educación', 'school', '#496DA8', null],
  [
    'category-education-tuition',
    'Matrícula o mensualidad',
    'school-outline',
    '#496DA8',
    'category-education',
  ],
  ['category-education-books', 'Libros', 'book', '#496DA8', 'category-education'],
  [
    'category-education-materials',
    'Materiales de estudio',
    'pencil',
    '#496DA8',
    'category-education',
  ],
  [
    'category-education-courses',
    'Curso o capacitación',
    'library',
    '#496DA8',
    'category-education',
  ],
  ['category-education-printing', 'Copias o impresiones', 'print', '#496DA8', 'category-education'],
  ['category-education-software', 'Software educativo', 'laptop', '#496DA8', 'category-education'],
  ['category-education-exam', 'Examen o certificación', 'ribbon', '#496DA8', 'category-education'],

  ['category-games', 'Entretenimiento', 'game-controller', '#7357A6', null],
  ['category-games-purchase', 'Videojuego', 'game-controller-outline', '#7357A6', 'category-games'],
  ['category-games-ingame', 'Compra dentro de videojuego', 'diamond', '#7357A6', 'category-games'],
  [
    'category-games-subscription',
    'Suscripción de videojuegos',
    'logo-playstation',
    '#7357A6',
    'category-games',
  ],
  ['category-games-cinema', 'Cine', 'film', '#7357A6', 'category-games'],
  ['category-games-event', 'Evento o entrada', 'ticket', '#7357A6', 'category-games'],
  ['category-games-nightlife', 'Salida o diversión', 'people', '#7357A6', 'category-games'],
  ['category-games-hobby', 'Hobby o colección', 'extension-puzzle', '#7357A6', 'category-games'],
  ['category-games-sports', 'Deporte recreativo', 'football', '#7357A6', 'category-games'],

  ['category-technology', 'Tecnología', 'hardware-chip', '#536A78', null],
  [
    'category-technology-device',
    'Celular o dispositivo',
    'phone-portrait-outline',
    '#536A78',
    'category-technology',
  ],
  [
    'category-technology-computer',
    'Computadora o componente',
    'desktop',
    '#536A78',
    'category-technology',
  ],
  [
    'category-technology-accessory',
    'Accesorio tecnológico',
    'headset',
    '#536A78',
    'category-technology',
  ],
  [
    'category-technology-software',
    'Aplicación o software',
    'apps',
    '#536A78',
    'category-technology',
  ],
  [
    'category-technology-repair',
    'Reparación tecnológica',
    'build',
    '#536A78',
    'category-technology',
  ],
  ['category-technology-gaming', 'Periférico gaming', 'keypad', '#536A78', 'category-technology'],

  ['category-personal', 'Cuidado personal y ropa', 'shirt', '#A24F75', null],
  ['category-personal-clothing', 'Ropa', 'shirt-outline', '#A24F75', 'category-personal'],
  ['category-personal-shoes', 'Calzado', 'footsteps', '#A24F75', 'category-personal'],
  ['category-personal-haircut', 'Corte de cabello', 'cut', '#A24F75', 'category-personal'],
  ['category-personal-hygiene', 'Higiene personal', 'body', '#A24F75', 'category-personal'],
  ['category-personal-cosmetics', 'Cosmética o cuidado', 'flower', '#A24F75', 'category-personal'],
  ['category-personal-laundry', 'Lavandería', 'water', '#A24F75', 'category-personal'],
  ['category-personal-accessory', 'Accesorio personal', 'watch', '#A24F75', 'category-personal'],

  ['category-family', 'Familia y vida social', 'people', '#B05E54', null],
  ['category-family-gift', 'Regalo', 'gift', '#B05E54', 'category-family'],
  ['category-family-support', 'Apoyo familiar', 'heart', '#B05E54', 'category-family'],
  [
    'category-family-celebration',
    'Cumpleaños o celebración',
    'balloon',
    '#B05E54',
    'category-family',
  ],
  ['category-family-donation', 'Donación o ayuda', 'hand-left', '#B05E54', 'category-family'],
  ['category-family-friends', 'Gasto con amigos', 'people-circle', '#B05E54', 'category-family'],

  ['category-pets', 'Mascotas', 'paw', '#7C7440', null],
  ['category-pets-food', 'Alimento para mascota', 'nutrition', '#7C7440', 'category-pets'],
  ['category-pets-vet', 'Veterinaria', 'medical', '#7C7440', 'category-pets'],
  ['category-pets-care', 'Higiene de mascota', 'water', '#7C7440', 'category-pets'],
  ['category-pets-accessory', 'Accesorio para mascota', 'paw-outline', '#7C7440', 'category-pets'],

  ['category-travel', 'Viajes', 'airplane', '#397F94', null],
  ['category-travel-ticket', 'Pasaje de viaje', 'airplane-outline', '#397F94', 'category-travel'],
  ['category-travel-lodging', 'Hospedaje', 'bed-outline', '#397F94', 'category-travel'],
  ['category-travel-food', 'Comida durante viaje', 'restaurant', '#397F94', 'category-travel'],
  ['category-travel-activity', 'Actividad turística', 'map', '#397F94', 'category-travel'],
  ['category-travel-insurance', 'Seguro de viaje', 'shield', '#397F94', 'category-travel'],

  ['category-projects', 'Proyectos y trabajo', 'briefcase', '#5B6470', null],
  ['category-projects-tools', 'Herramienta o equipo', 'construct', '#5B6470', 'category-projects'],
  ['category-projects-hosting', 'Hosting o dominio', 'globe', '#5B6470', 'category-projects'],
  [
    'category-projects-software',
    'Software de trabajo',
    'code-slash',
    '#5B6470',
    'category-projects',
  ],
  ['category-projects-materials', 'Materiales de proyecto', 'cube', '#5B6470', 'category-projects'],
  [
    'category-projects-service',
    'Servicio profesional',
    'briefcase-outline',
    '#5B6470',
    'category-projects',
  ],

  ['category-other', 'Por clasificar', 'help-circle', '#747A74', null],
] as const;

async function migrateCategoryCatalog(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const item of CATEGORY_CATALOG) {
      await db.runAsync(
        'INSERT OR IGNORE INTO categories(id,name,icon,color,parent_id) VALUES(?,?,?,?,?)',
        ...item,
      );
      await db.runAsync(
        'UPDATE categories SET name=?,icon=?,color=?,parent_id=? WHERE id=?',
        item[1],
        item[2],
        item[3],
        item[4],
        item[0],
      );
    }
    await db.runAsync(
      "UPDATE favorites SET category_id='category-food-water' WHERE id='favorite-water' AND category_id='category-food'",
    );
    await db.runAsync(
      "UPDATE favorites SET category_id='category-transport-public' WHERE id='favorite-pasaje' AND category_id='category-transport'",
    );
    await db.runAsync(
      "UPDATE favorites SET category_id='category-food-snack' WHERE id='favorite-snack' AND category_id='category-food'",
    );
    await db.execAsync('PRAGMA user_version = 2;');
  });
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
    for (const item of CATEGORY_CATALOG) {
      await db.runAsync(
        'INSERT OR IGNORE INTO categories(id,name,icon,color,parent_id) VALUES(?,?,?,?,?)',
        ...item,
      );
    }
    const favorites = [
      ['favorite-water', 'Agua', 100, 'account-yape', 'category-food-water', 0],
      ['favorite-pasaje', 'Pasaje', null, 'account-yape', 'category-transport-public', 1],
      ['favorite-snack', 'Algo rápido', null, 'account-yape', 'category-food-snack', 2],
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
