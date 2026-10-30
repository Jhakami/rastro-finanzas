import type { TransactionQuery } from '@/domain/ledger';

// Bound parameters only. julianday compares instants even in imported offset timestamps.
export const LEDGER_PAGE_SQL = `
SELECT t.id,t.kind,t.amount_cents AS amountCents,t.account_id AS accountId,
 t.destination_account_id AS destinationAccountId,t.category_id AS categoryId,
 t.occurred_at AS occurredAt,t.merchant,t.note,t.source,
 t.location_cell_id AS locationCellId,t.micro_override AS microOverride,
 t.refund_of_id AS refundOfId,t.deleted_at AS deletedAt,
 (SELECT json_group_array(tt.tag_id) FROM transaction_tags tt WHERE tt.transaction_id=t.id) AS tagIdsJson,
 CASE WHEN l.id IS NULL THEN NULL ELSE json_object('id',l.id,'centerLatitude',l.center_latitude,
 'centerLongitude',l.center_longitude,'label',l.label) END AS locationJson
FROM transactions t
LEFT JOIN location_cells l ON l.id=t.location_cell_id
LEFT JOIN categories c ON c.id=t.category_id
LEFT JOIN categories parent ON parent.id=c.parent_id
WHERE t.deleted_at IS NULL
 AND ($account IS NULL OR t.account_id=$account OR (t.kind='transfer' AND t.destination_account_id=$account))
 AND ($kind IS NULL OR t.kind=$kind)
 AND ($category IS NULL OR t.category_id=$category OR c.parent_id=$category)
 AND ($from IS NULL OR julianday(t.occurred_at)>=julianday($from))
 AND ($until IS NULL OR julianday(t.occurred_at)<julianday($until))
 AND NOT EXISTS (SELECT 1 FROM json_each($tags) selected WHERE NOT EXISTS
   (SELECT 1 FROM transaction_tags tt WHERE tt.transaction_id=t.id AND tt.tag_id=selected.value))
 AND ($text='' OR instr(lower(coalesce(t.merchant,'')||' '||coalesce(t.note,'')||' '||coalesce(t.source,'')||' '||coalesce(c.name,'')||' '||coalesce(parent.name,'')),lower($text))>0
   OR EXISTS(SELECT 1 FROM transaction_tags tt JOIN tags tag ON tag.id=tt.tag_id
     WHERE tt.transaction_id=t.id AND instr(lower(tag.name),lower($text))>0))
 AND ($cursorDate IS NULL OR julianday(t.occurred_at)<julianday($cursorDate)
   OR (julianday(t.occurred_at)=julianday($cursorDate) AND t.id<$cursorId))
ORDER BY julianday(t.occurred_at) DESC,t.id DESC LIMIT 51
`;

export function ledgerParameters(query: TransactionQuery) {
  for (const date of [query.from, query.until, query.cursor?.occurredAt])
    if (date && !Number.isFinite(Date.parse(date))) throw new Error('Fecha de consulta inválida.');
  if (query.from && query.until && Date.parse(query.from) >= Date.parse(query.until))
    throw new Error('El intervalo debe tener inicio anterior al fin.');
  return {
    $account: query.accountId ?? null,
    $kind: query.kind ?? null,
    $category: query.categoryId ?? null,
    $from: query.from ?? null,
    $until: query.until ?? null,
    $tags: JSON.stringify([...new Set(query.tagIds ?? [])]),
    $text: query.text?.trim() ?? '',
    $cursorDate: query.cursor?.occurredAt ?? null,
    $cursorId: query.cursor?.id ?? null,
  };
}
