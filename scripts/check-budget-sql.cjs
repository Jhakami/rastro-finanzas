/* global __dirname */
const { DatabaseSync } = require('node:sqlite');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const assert = require('node:assert/strict');
function sqlFrom(file, constant) {
  const source = readFileSync(join(__dirname, '..', file), 'utf8');
  const match = source.match(new RegExp(constant + '\\s*=\\s*`([\\s\\S]*?)`'));
  assert.ok(match, `SQL constant ${constant} must exist`);
  return match[1];
}
const migration = sqlFrom('src/infrastructure/budget-migration.ts', 'BUDGET_MIGRATION_SQL');
const query = sqlFrom('src/infrastructure/budget-repository.ts', 'BUDGET_TOTAL_SQL');
const db = new DatabaseSync(':memory:');
db.exec(`PRAGMA foreign_keys=ON;
CREATE TABLE accounts(id TEXT PRIMARY KEY,is_archived INTEGER DEFAULT 0);
CREATE TABLE categories(id TEXT PRIMARY KEY,parent_id TEXT,is_archived INTEGER DEFAULT 0);
CREATE TABLE tags(id TEXT PRIMARY KEY);
CREATE TABLE transactions(id TEXT PRIMARY KEY,kind TEXT,amount_cents INTEGER,account_id TEXT,category_id TEXT,occurred_at TEXT,deleted_at TEXT);
CREATE TABLE transaction_tags(transaction_id TEXT,tag_id TEXT,PRIMARY KEY(transaction_id,tag_id));
CREATE TABLE spending_limits(id TEXT PRIMARY KEY,name TEXT,amount_cents INTEGER,category_id TEXT REFERENCES categories(id),account_id TEXT REFERENCES accounts(id),warning_percent INTEGER,enabled INTEGER);
INSERT INTO accounts(id) VALUES('cash'),('bank');
INSERT INTO categories(id,parent_id) VALUES('food',NULL),('water','food'),('travel',NULL);
INSERT INTO tags VALUES('a'),('b');
INSERT INTO spending_limits VALUES('scoped','Comida',10000,'food','cash',80,1),('general','General',20000,NULL,NULL,90,1),('archived','Old',5000,'water',NULL,120,0);
PRAGMA user_version=6;`);
db.exec('BEGIN');
db.exec(migration);
db.exec('COMMIT');
assert.equal(db.prepare('PRAGMA user_version').get().user_version, 7);
assert.equal(
  db.prepare("SELECT count(*) AS n FROM spending_limits WHERE period='monthly' AND notify=0").get()
    .n,
  3,
);
assert.equal(
  db.prepare("SELECT enabled FROM spending_limits WHERE id='archived'").get().enabled,
  0,
);
assert.equal(
  db.prepare("SELECT amount_cents FROM spending_limits WHERE id='scoped'").get().amount_cents,
  10000,
);
assert.equal(
  db.prepare("SELECT category_id FROM budget_categories WHERE budget_id='scoped'").get()
    .category_id,
  'food',
);
const insert = db.prepare('INSERT INTO transactions VALUES(?,?,?,?,?,?,?)');
insert.run('start', 'expense', 250, 'cash', 'water', '2026-10-01T00:00:00-05:00', null);
insert.run('dual', 'expense', 100, 'cash', 'water', '2026-10-10T12:00:00Z', null);
insert.run('bank', 'expense', 500, 'bank', 'water', '2026-10-10T12:00:00Z', null);
insert.run('other', 'expense', 300, 'cash', 'travel', '2026-10-10T12:00:00Z', null);
insert.run('before', 'expense', 111, 'cash', 'water', '2026-10-01T04:59:59Z', null);
insert.run('end', 'expense', 222, 'cash', 'water', '2026-11-01T05:00:00Z', null);
insert.run('deleted', 'expense', 333, 'cash', 'water', '2026-10-10T12:00:00Z', 'deleted');
for (const kind of ['income', 'transfer', 'refund', 'adjustment'])
  insert.run(kind, kind, 900, 'cash', 'water', '2026-10-10T12:00:00Z', null);
db.exec("INSERT INTO transaction_tags VALUES('start','a'),('dual','a'),('dual','b');");
function total(id) {
  return db
    .prepare(query)
    .get(id, '2026-10-01T05:00:00Z', '2026-11-01T05:00:00Z', id, id, id, id, id);
}
assert.deepEqual({ ...total('scoped') }, { spentCents: 350, count: 2 });
assert.deepEqual({ ...total('general') }, { spentCents: 1150, count: 4 });
const plan = db
  .prepare('EXPLAIN QUERY PLAN ' + query)
  .all(
    'general',
    '2026-10-01T05:00:00Z',
    '2026-11-01T05:00:00Z',
    'general',
    'general',
    'general',
    'general',
    'general',
  );
assert.ok(
  plan.some((row) => row.detail.includes('SEARCH t USING INDEX idx_budget_expenses')),
  'Budget totals must use the bounded date index rather than scan all history',
);
db.exec(
  "INSERT INTO budget_categories VALUES('scoped','water'); INSERT INTO budget_tags VALUES('scoped','a'),('scoped','b');",
);
assert.deepEqual({ ...total('scoped') }, { spentCents: 350, count: 2 });
db.exec(
  "UPDATE accounts SET is_archived=1 WHERE id='cash'; UPDATE categories SET is_archived=1 WHERE id='water';",
);
assert.deepEqual({ ...total('scoped') }, { spentCents: 350, count: 2 });
db.exec(
  "DELETE FROM budget_tags WHERE budget_id='scoped'; INSERT INTO budget_accounts VALUES('scoped','bank');",
);
assert.deepEqual({ ...total('scoped') }, { spentCents: 850, count: 3 });
assert.throws(() => db.exec("INSERT INTO budget_accounts VALUES('scoped','missing')"));
db.exec(
  "INSERT OR IGNORE INTO budget_alerts VALUES('scoped','2026-10-01','warning'); INSERT OR IGNORE INTO budget_alerts VALUES('scoped','2026-10-01','warning');",
);
assert.equal(db.prepare('SELECT count(*) AS n FROM budget_alerts').get().n, 1);
assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
db.close();
console.log(
  'Budget SQL: migration v6→v7, preserved limits, boundaries, scopes, no double-counting, archived references and alert deduplication passed.',
);
