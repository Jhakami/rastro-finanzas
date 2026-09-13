import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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
  sortOrder: integer('sort_order').notNull().default(0),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
});

export const spendingLimits = sqliteTable('spending_limits', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  amountCents: integer('amount_cents').notNull(),
  categoryId: text('category_id').references(() => categories.id),
  accountId: text('account_id').references(() => accounts.id),
  warningPercent: integer('warning_percent').notNull().default(80),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
});

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
