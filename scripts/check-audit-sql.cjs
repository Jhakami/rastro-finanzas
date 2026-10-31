/* global __dirname */
const { DatabaseSync } = require('node:sqlite');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { randomUUID } = require('node:crypto');
const ts = require('typescript');
const assert = require('node:assert/strict');
const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE accounts(id TEXT PRIMARY KEY,name TEXT,is_archived INTEGER);
CREATE TABLE categories(id TEXT PRIMARY KEY,name TEXT,is_archived INTEGER);
CREATE TABLE transactions(id TEXT PRIMARY KEY,kind TEXT,amount_cents INTEGER,account_id TEXT,destination_account_id TEXT,category_id TEXT,occurred_at TEXT,deleted_at TEXT,updated_at TEXT,note TEXT,location_cell_id TEXT);
CREATE TABLE transaction_tags(transaction_id TEXT,tag_id TEXT);
CREATE TABLE audit_events(id TEXT PRIMARY KEY,entity_type TEXT,entity_id TEXT,action TEXT,payload TEXT,occurred_at TEXT);
INSERT INTO accounts VALUES('a','Archivada',1),('b','Banco',0);
INSERT INTO categories VALUES('c','Categoría archivada',1);
INSERT INTO transactions VALUES('transfer','transfer',500,'a','b','c','2026-01-01T00:00:00Z','2026-02-01T00:00:00Z','old','Conservar','zone');
INSERT INTO transaction_tags VALUES('transfer','tag');
PRAGMA user_version=8;`);
const original = db.prepare('SELECT * FROM transactions').get();
const migration = readFileSync(
  join(__dirname, '../src/infrastructure/audit-migration.ts'),
  'utf8',
).match(/AUDIT_MIGRATION_SQL\s*=\s*`([\s\S]*?)`/)[1];
db.exec(migration);
assert.equal(db.prepare('PRAGMA user_version').get().user_version, 9);
assert.deepEqual(db.prepare('SELECT * FROM transactions').get(), original);
const connection = {
  getFirstAsync: async (sql, ...args) => db.prepare(sql).get(...args) ?? null,
  getAllAsync: async (sql, ...args) => db.prepare(sql).all(...args),
  runAsync: async (sql, ...args) => db.prepare(sql).run(...args),
};
let queue = Promise.resolve();
const database = {
  openDatabase: async () => connection,
  withWriteTransaction(operation) {
    const task = queue.then(async () => {
      db.exec('BEGIN IMMEDIATE');
      try {
        const result = await operation(connection);
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    });
    queue = task.catch(() => {});
    return task;
  },
};
const moduleOutput = { exports: {} };
const compiled = ts.transpileModule(
  readFileSync(join(__dirname, '../src/infrastructure/audit-repository.ts'), 'utf8'),
  {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  },
).outputText;
new Function('require', 'exports', compiled)((name) => {
  if (name === 'expo-crypto') return { randomUUID };
  if (name === './database') return database;
  throw new Error(`Unexpected dependency ${name}`);
}, moduleOutput.exports);
const repository = new moduleOutput.exports.SQLiteAuditRepository();
async function main() {
  const result = await Promise.all([
    repository.restoreTransaction('transfer', 'Recuperar'),
    repository.restoreTransaction('transfer', 'Reintento'),
  ]);
  assert.deepEqual(result, [true, false]);
  const restored = db.prepare('SELECT * FROM transactions').get();
  assert.deepEqual(
    { ...restored, deleted_at: original.deleted_at, updated_at: original.updated_at },
    { ...original },
  );
  assert.equal(restored.deleted_at, null);
  assert.equal(db.prepare('SELECT count(*) AS n FROM transaction_tags').get().n, 1);
  assert.equal(db.prepare('SELECT count(*) AS n FROM audit_events').get().n, 1);
  assert.equal(db.prepare("SELECT is_archived FROM accounts WHERE id='a'").get().is_archived, 1);
  const effects = db
    .prepare(
      "SELECT -amount_cents AS debit,amount_cents AS credit FROM transactions WHERE kind='transfer' AND deleted_at IS NULL",
    )
    .get();
  assert.equal(effects.debit + effects.credit, 0);
  db.exec(`UPDATE transactions SET deleted_at='2026-02-01T00:00:00Z';
    CREATE TRIGGER fail_audit BEFORE INSERT ON audit_events BEGIN SELECT RAISE(ABORT,'audit failure'); END;`);
  await assert.rejects(repository.restoreTransaction('transfer', 'Fallar'), /audit failure/);
  assert.equal(
    db.prepare('SELECT deleted_at FROM transactions').get().deleted_at,
    '2026-02-01T00:00:00Z',
  );
  db.exec('DROP TRIGGER fail_audit');
  const insert = db.prepare(
    "INSERT INTO audit_events VALUES(?,'transaction','transfer','deleted',NULL,?)",
  );
  for (let i = 0; i < 121; i++)
    insert.run(
      String(i).padStart(4, '0'),
      i % 2 ? '2026-01-01T00:00:00Z' : '2025-12-31T19:00:00-05:00',
    );
  let cursor = null;
  const ids = [];
  do {
    const page = await repository.page(cursor);
    assert.ok(page.items.length <= 50);
    ids.push(...page.items.map((row) => row.id));
    cursor = page.nextCursor;
  } while (cursor);
  assert.equal(ids.length, 122);
  assert.equal(new Set(ids).size, 122);
  const deleted = await repository.deletedPage();
  assert.equal(deleted.items[0].accountArchived, 1);
  assert.equal(deleted.items[0].categoryArchived, 1);
  assert.equal(deleted.items[0].destinationName, 'Banco');
  const copy = db.prepare(
    "INSERT INTO transactions SELECT ?,kind,amount_cents,account_id,destination_account_id,category_id,occurred_at,deleted_at,updated_at,note,location_cell_id FROM transactions WHERE id='transfer'",
  );
  for (let i = 0; i < 120; i++) copy.run(`deleted-${i}`);
  cursor = null;
  const deletedIds = [];
  do {
    const page = await repository.deletedPage(cursor);
    deletedIds.push(...page.items.map((row) => row.id));
    cursor = page.nextCursor;
  } while (cursor);
  assert.equal(deletedIds.length, 121);
  assert.equal(new Set(deletedIds).size, 121);
  db.close();
  process.stdout.write(
    'Auditoría SQLite: migración, cursor, reintentos serializados, conservación y rollback correctos.\n',
  );
}
main().catch((error) => {
  process.stderr.write(String(error));
  process.exitCode = 1;
});
