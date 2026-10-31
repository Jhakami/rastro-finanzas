/* global __dirname */
const { DatabaseSync } = require('node:sqlite');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const assert = require('node:assert/strict');
function sqlFrom(file, constant) {
  const source = readFileSync(join(__dirname, '..', file), 'utf8');
  return source.match(new RegExp(constant + '\\s*=\\s*`([\\s\\S]*?)`'))[1];
}
const sql = sqlFrom('src/infrastructure/ledger-query.ts', 'LEDGER_PAGE_SQL');
const migration = sqlFrom('src/infrastructure/ledger-migration.ts', 'LEDGER_MIGRATION_SQL');
const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE transactions(id TEXT PRIMARY KEY,kind TEXT,amount_cents INTEGER,account_id TEXT,destination_account_id TEXT,category_id TEXT,occurred_at TEXT,merchant TEXT,note TEXT,source TEXT,location_cell_id TEXT,micro_override INTEGER,refund_of_id TEXT,deleted_at TEXT);
CREATE TABLE categories(id TEXT PRIMARY KEY,parent_id TEXT,name TEXT);
CREATE TABLE tags(id TEXT PRIMARY KEY,name TEXT);
CREATE TABLE transaction_tags(transaction_id TEXT,tag_id TEXT,PRIMARY KEY(transaction_id,tag_id));
CREATE TABLE location_cells(id TEXT PRIMARY KEY,center_latitude REAL,center_longitude REAL,label TEXT);
CREATE TABLE accounts(id TEXT PRIMARY KEY,is_archived INTEGER);
INSERT INTO accounts VALUES('cash',0),('old',1);
INSERT INTO categories VALUES('food',NULL,'Comida'),('water','food','Agua');
INSERT INTO tags VALUES('a','Viaje'),('b','Trabajo');
PRAGMA user_version=7;`);
const insert = db.prepare(
  'INSERT INTO transactions(id,kind,amount_cents,account_id,destination_account_id,category_id,occurred_at,merchant,deleted_at) VALUES(?,?,?,?,?,?,?,?,?)',
);
for (let i = 0; i < 5000; i++)
  insert.run(
    String(i).padStart(5, '0'),
    'expense',
    100,
    'old',
    null,
    'water',
    new Date(Date.UTC(2020, 0, 1) + Math.floor(i / 3) * 86400000).toISOString(),
    'Compra',
    null,
  );
insert.run(
  'start',
  'expense',
  200,
  'cash',
  null,
  'water',
  '2026-10-01T00:00:00-05:00',
  '100% real',
  null,
);
insert.run('same', 'expense', 200, 'cash', null, 'water', '2026-10-01T05:00:00Z', 'Otro', null);
insert.run('before', 'expense', 200, 'cash', null, 'water', '2026-10-01T04:59:59Z', 'Compra', null);
insert.run('end', 'expense', 200, 'cash', null, 'water', '2026-11-01T05:00:00Z', 'Compra', null);
insert.run(
  'deleted',
  'expense',
  200,
  'cash',
  null,
  'water',
  '2026-10-10T05:00:00Z',
  'Compra',
  'deleted',
);
insert.run('transfer', 'transfer', 200, 'cash', 'old', null, '2026-10-15T05:00:00Z', null, null);
db.exec("INSERT INTO transaction_tags VALUES('start','a'),('start','b'),('same','a');");
const beforeMigration = db
  .prepare('SELECT count(*) n,sum(amount_cents) amount FROM transactions')
  .get();
db.exec('BEGIN');
db.exec(migration);
db.exec('COMMIT');
assert.equal(db.prepare('PRAGMA user_version').get().user_version, 8);
assert.deepEqual(
  db.prepare('SELECT count(*) n,sum(amount_cents) amount FROM transactions').get(),
  beforeMigration,
);
const defaults = {
  $account: null,
  $kind: null,
  $category: null,
  $from: null,
  $until: null,
  $tags: '[]',
  $text: '',
  $cursorDate: null,
  $cursorId: null,
};
const page = (params) => db.prepare(sql).all({ ...defaults, ...params });
const all = [];
let cursor = {};
do {
  const rows = page(cursor);
  assert.ok(rows.length <= 51);
  const items = rows.slice(0, 50);
  all.push(...items.map((row) => row.id));
  if (rows.length <= 50) break;
  const last = items.at(-1);
  cursor = { $cursorDate: last.occurredAt, $cursorId: last.id };
} while (true);
assert.equal(new Set(all).size, 5005);
assert.equal(all.length, 5005);
assert.deepEqual(
  all,
  db
    .prepare(
      'SELECT id FROM transactions WHERE deleted_at IS NULL ORDER BY julianday(occurred_at) DESC,id DESC',
    )
    .all()
    .map((r) => r.id),
);
const month = { $from: '2026-10-01T05:00:00Z', $until: '2026-11-01T05:00:00Z' };
assert.deepEqual(
  page({ ...month, $account: 'cash', $kind: 'expense', $category: 'food', $tags: '["a","b"]' }).map(
    (r) => r.id,
  ),
  ['start'],
);
assert.deepEqual(
  page({ ...month, $text: '%' }).map((r) => r.id),
  ['start'],
);
assert.deepEqual(
  page({ ...month, $text: 'trabajo' }).map((r) => r.id),
  ['start'],
);
assert.deepEqual(
  page({ ...month, $account: 'old' }).map((r) => r.id),
  ['transfer'],
);
assert.equal(page({ $account: 'old' }).length, 51); // Archived account is not excluded.
assert.equal(page({ $text: "' OR 1=1 --" }).length, 0);
const plan = db.prepare('EXPLAIN QUERY PLAN ' + sql).all(defaults);
assert.ok(plan.some((row) => row.detail.includes('idx_ledger_page')));
// The report runs against the same real schema and archived-account fixture.
const reportSql = sqlFrom('src/infrastructure/reporting-sql.ts', 'REPORT_SQL');
const balanceSql = sqlFrom('src/infrastructure/reporting-sql.ts', 'BALANCES_SQL');
const zonesSql = sqlFrom('src/infrastructure/reporting-sql.ts', 'ZONES_SQL');
db.exec(`ALTER TABLE accounts ADD COLUMN initial_balance_cents INTEGER NOT NULL DEFAULT 0;
UPDATE accounts SET initial_balance_cents=1000 WHERE id='cash';
INSERT INTO accounts VALUES('empty',0,123);
UPDATE transactions SET micro_override=1 WHERE id='start';
UPDATE transactions SET micro_override=0 WHERE id='same';
INSERT INTO location_cells VALUES('zone',-12,-77,'Zona');
UPDATE transactions SET location_cell_id='zone' WHERE id='start';`);
assert.equal(
  db
    .prepare(balanceSql)
    .all()
    .find((r) => r.id === 'cash').balance,
  0,
);
assert.equal(
  db
    .prepare(balanceSql)
    .all()
    .find((r) => r.id === 'old').balance,
  -499800,
);
assert.equal(
  db
    .prepare(balanceSql)
    .all()
    .find((r) => r.id === 'empty').balance,
  123,
);
assert.equal(db.prepare(zonesSql).all()[0].amount, 200);
const days = Array.from({ length: 31 }, (_, i) => ({
  label: `${i + 1}/10`,
  from: new Date(Date.UTC(2026, 9, i + 1, 5)).toISOString(),
  until: new Date(Date.UTC(2026, 9, i + 2, 5)).toISOString(),
}));
const reportParams = {
  $from: month.$from,
  $until: month.$until,
  $account: 'cash',
  $threshold: 500,
  $days: JSON.stringify(days),
};
const report = db.prepare(reportSql).get(reportParams);
assert.equal(report.expenseCents, 400);
assert.equal(report.expenseCount, 2);
assert.equal(report.microExpenseCents, 200);
assert.equal(report.microCount, 1);
assert.equal(report.incomeCents, 0);
assert.equal(report.incomeCount, 0);
assert.equal(JSON.parse(report.dailyJson).length, 31);
assert.equal(JSON.parse(report.dailyJson)[0].expenseCents, 400);
assert.deepEqual(JSON.parse(report.tagsJson), [
  { id: 'a', value: 400 },
  { id: 'b', value: 200 },
]);
assert.equal(JSON.parse(report.recentJson).length, 3); // includes transfer; flow excludes it
for (let i = 0; i < 55; i++)
  insert.run(
    'sample' + i,
    'expense',
    100,
    'cash',
    null,
    'water',
    '2026-10-02T05:00:00Z',
    'Compra',
    null,
  );
insert.run('income', 'income', 1000, 'cash', null, null, '2026-10-02T05:00:00Z', null, null);
insert.run('refund', 'refund', 100, 'cash', null, null, '2026-10-02T05:00:00Z', null, null);
insert.run('adjust', 'adjustment', -25, 'cash', null, null, '2026-10-02T05:00:00Z', null, null);
const expanded = db.prepare(reportSql).get(reportParams);
assert.equal(expanded.expenseCount, 57);
assert.equal(expanded.expenseCents, 5900);
assert.equal(expanded.incomeCents, 1100);
assert.equal(expanded.incomeCount, 2);
assert.equal(JSON.parse(expanded.scatterJson).length, 30);
assert.equal(JSON.parse(expanded.recentJson).length, 5);
assert.equal(JSON.parse(expanded.topJson).length, 5);
const empty = db.prepare(reportSql).get({ ...reportParams, $account: 'empty' });
assert.equal(empty.expenseCount, 0);
assert.equal(empty.expenseCents, 0);
assert.equal(JSON.parse(empty.dailyJson).length, 31);
assert.deepEqual(JSON.parse(empty.topJson), []);
// Regression: older years must not inflate the scoped result or bridge payload.
db.exec('BEGIN');
for (let i = 0; i < 100000; i++)
  insert.run(
    'history' + i,
    'expense',
    100,
    'old',
    null,
    'water',
    '2019-01-01T05:00:00Z',
    'Compra',
    null,
  );
db.exec('COMMIT');
const started = performance.now();
assert.deepEqual(db.prepare(reportSql).get(reportParams), expanded);
console.log(
  `Reporting SQL: 100k additional historical rows, aggregates/samples/balances/zones correct; monthly query ${(performance.now() - started).toFixed(1)} ms (desktop, not Android).`,
);
db.close();
console.log(
  'Ledger SQL: 5005 rows across years, ties/offsets, pages without gaps/duplicates, scopes/tags/search, archived account, migration v7→v8 and index passed.',
);
