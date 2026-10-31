export const BALANCES_SQL = `
WITH effects AS (
 SELECT account_id AS id,CASE kind WHEN 'expense' THEN -abs(amount_cents) WHEN 'transfer' THEN -abs(amount_cents)
 WHEN 'income' THEN abs(amount_cents) WHEN 'refund' THEN abs(amount_cents) WHEN 'adjustment' THEN amount_cents ELSE 0 END AS amount
 FROM transactions WHERE deleted_at IS NULL
 UNION ALL SELECT destination_account_id,abs(amount_cents) FROM transactions WHERE deleted_at IS NULL AND kind='transfer'
), totals AS (SELECT id,sum(amount) AS amount FROM effects GROUP BY id)
SELECT a.id,a.initial_balance_cents+coalesce(t.amount,0) AS balance FROM accounts a LEFT JOIN totals t ON t.id=a.id
`;

// One statement = one SQLite snapshot. Only aggregates and bounded samples cross the bridge.
export const REPORT_SQL = `
WITH scoped AS MATERIALIZED (
 SELECT t.*,json_object('id',id,'kind',kind,'amountCents',amount_cents,'accountId',account_id,
 'destinationAccountId',destination_account_id,'categoryId',category_id,'occurredAt',occurred_at,
 'merchant',merchant,'source',source,'note',note) AS item
 FROM transactions t WHERE deleted_at IS NULL AND julianday(occurred_at)>=julianday($from)
 AND julianday(occurred_at)<julianday($until)
 AND ($account IS NULL OR account_id=$account OR (kind='transfer' AND destination_account_id=$account))
), expenses AS (SELECT * FROM scoped WHERE kind='expense'),
days AS (SELECT json_extract(value,'$.label') AS label,json_extract(value,'$.from') AS start,json_extract(value,'$.until') AS stop FROM json_each($days)),
daily AS (SELECT d.label,d.start,
 coalesce(sum(CASE WHEN s.kind IN ('income','refund') THEN s.amount_cents ELSE 0 END),0) AS income,
 coalesce(sum(CASE WHEN s.kind='expense' THEN s.amount_cents ELSE 0 END),0) AS expense
 FROM days d LEFT JOIN scoped s ON julianday(s.occurred_at)>=julianday(d.start) AND julianday(s.occurred_at)<julianday(d.stop)
 GROUP BY d.start,d.label ORDER BY d.start),
categories AS (SELECT coalesce(category_id,'unclassified') AS id,sum(amount_cents) AS value FROM expenses GROUP BY category_id),
tagged AS (SELECT coalesce(tt.tag_id,'untagged') AS id,sum(e.amount_cents) AS value FROM expenses e LEFT JOIN transaction_tags tt ON tt.transaction_id=e.id GROUP BY tt.tag_id)
SELECT
 (SELECT coalesce(sum(amount_cents),0) FROM scoped WHERE kind IN ('income','refund')) AS incomeCents,
 (SELECT coalesce(sum(amount_cents),0) FROM expenses) AS expenseCents,
 (SELECT count(*) FROM scoped WHERE kind IN ('income','refund')) AS incomeCount,
 (SELECT count(*) FROM expenses) AS expenseCount,
 (SELECT coalesce(sum(amount_cents),0) FROM expenses WHERE micro_override=1 OR (micro_override IS NULL AND amount_cents<=$threshold)) AS microExpenseCents,
 (SELECT count(*) FROM expenses WHERE micro_override=1 OR (micro_override IS NULL AND amount_cents<=$threshold)) AS microCount,
 (SELECT json_group_array(json_object('label',label,'incomeCents',income,'expenseCents',expense)) FROM daily) AS dailyJson,
 (SELECT json_group_array(json_object('id',id,'value',value)) FROM (SELECT * FROM categories ORDER BY value DESC,id)) AS categoriesJson,
 (SELECT json_group_array(json_object('id',id,'value',value)) FROM (SELECT * FROM tagged ORDER BY value DESC,id)) AS tagsJson,
 (SELECT json_group_array(json(item)) FROM (SELECT item FROM scoped ORDER BY julianday(occurred_at) DESC,id DESC LIMIT 5)) AS recentJson,
 (SELECT json_group_array(json(item)) FROM (SELECT item FROM expenses ORDER BY amount_cents DESC,id DESC LIMIT 5)) AS topJson,
 (SELECT json_group_array(json(item)) FROM (SELECT item FROM expenses ORDER BY julianday(occurred_at) DESC,id DESC LIMIT 30)) AS scatterJson
`;
export const ZONES_SQL = `
SELECT l.id,l.center_latitude AS latitude,l.center_longitude AS longitude,
coalesce(l.label,'Zona sin nombre') AS label,sum(t.amount_cents) AS amount,count(*) AS count
FROM transactions t JOIN location_cells l ON l.id=t.location_cell_id
WHERE t.kind='expense' AND t.deleted_at IS NULL GROUP BY l.id ORDER BY amount DESC,l.id
`;
export const RECENT_CATEGORIES_SQL = `
SELECT t.category_id AS id FROM transactions t JOIN categories c ON c.id=t.category_id
WHERE t.kind='expense' AND t.deleted_at IS NULL AND c.is_archived=0
GROUP BY t.category_id ORDER BY max(julianday(t.occurred_at)) DESC,t.category_id LIMIT 5
`;
