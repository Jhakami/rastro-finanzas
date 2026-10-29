import { integer, real, sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  initialBalanceCents: integer('initial_balance_cents').notNull().default(0),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  parentId: text('parent_id'),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const locationCells = sqliteTable('location_cells', {
  id: text('id').primaryKey(),
  centerLatitude: real('center_latitude').notNull(),
  centerLongitude: real('center_longitude').notNull(),
  label: text('label'),
});

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  amountCents: integer('amount_cents').notNull(),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id),
  destinationAccountId: text('destination_account_id').references(() => accounts.id),
  categoryId: text('category_id').references(() => categories.id),
  occurredAt: text('occurred_at').notNull(),
  merchant: text('merchant'),
  note: text('note'),
  source: text('source'),
  locationCellId: text('location_cell_id').references(() => locationCells.id),
  microOverride: integer('micro_override', { mode: 'boolean' }),
  refundOfId: text('refund_of_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const transactionTags = sqliteTable('transaction_tags', {
  transactionId: text('transaction_id')
    .notNull()
    .references(() => transactions.id),
  tagId: text('tag_id')
    .notNull()
    .references(() => tags.id),
});

export const favorites = sqliteTable('favorites', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  amountCents: integer('amount_cents'),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id),
  merchant: text('merchant'),
  note: text('note'),
  usageCount: integer('usage_count').notNull().default(0),
  amountMode: text('amount_mode').notNull().default('variable'),
  lastUsedAt: text('last_used_at'),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
  sortOrder: integer('sort_order').notNull().default(0),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
});

export const favoriteTags = sqliteTable('favorite_tags', {
  favoriteId: text('favorite_id')
    .notNull()
    .references(() => favorites.id),
  tagId: text('tag_id')
    .notNull()
    .references(() => tags.id),
});

export const spendingLimits = sqliteTable('spending_limits', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  amountCents: integer('amount_cents').notNull(),
  categoryId: text('category_id').references(() => categories.id),
  accountId: text('account_id').references(() => accounts.id),
  warningPercent: integer('warning_percent').notNull().default(80),
  period: text('period').notNull().default('monthly'),
  sortOrder: integer('sort_order').notNull().default(0),
  notify: integer('notify', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
});

export const budgetAccounts = sqliteTable(
  'budget_accounts',
  {
    budgetId: text('budget_id')
      .notNull()
      .references(() => spendingLimits.id),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
  },
  (table) => [primaryKey({ columns: [table.budgetId, table.accountId] })],
);
export const budgetCategories = sqliteTable(
  'budget_categories',
  {
    budgetId: text('budget_id')
      .notNull()
      .references(() => spendingLimits.id),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id),
  },
  (table) => [primaryKey({ columns: [table.budgetId, table.categoryId] })],
);
export const budgetTags = sqliteTable(
  'budget_tags',
  {
    budgetId: text('budget_id')
      .notNull()
      .references(() => spendingLimits.id),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id),
  },
  (table) => [primaryKey({ columns: [table.budgetId, table.tagId] })],
);
export const budgetAlerts = sqliteTable(
  'budget_alerts',
  {
    budgetId: text('budget_id')
      .notNull()
      .references(() => spendingLimits.id),
    periodStart: text('period_start').notNull(),
    level: text('level').notNull(),
  },
  (table) => [primaryKey({ columns: [table.budgetId, table.periodStart, table.level] })],
);

export const auditEvents = sqliteTable('audit_events', {
  id: text('id').primaryKey(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(),
  payload: text('payload'),
  occurredAt: text('occurred_at').notNull(),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
