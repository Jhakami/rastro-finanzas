import type { FinanceTransaction } from '@/domain/types';
import { openDatabase } from './database';
import { LEDGER_PAGE_SQL } from './ledger-query';
// Reuse the same projection as pagination (tags and approximate location included).
const projection = LEDGER_PAGE_SQL.slice(
  0,
  LEDGER_PAGE_SQL.indexOf('\nWHERE t.deleted_at IS NULL'),
);
type Row = FinanceTransaction & { tagIdsJson: string; locationJson: string | null };
function decode({ tagIdsJson, locationJson, ...row }: Row): FinanceTransaction {
  return {
    ...row,
    tagIds: JSON.parse(tagIdsJson) as string[],
    location: locationJson ? (JSON.parse(locationJson) as FinanceTransaction['location']) : null,
  };
}
export const transactionReader = {
  async byId(id: string) {
    const row = await (
      await openDatabase()
    ).getFirstAsync<Row>(projection + ' WHERE t.deleted_at IS NULL AND t.id=?', id);
    return row ? decode(row) : null;
  },
  async window(from: string, until: string) {
    if (
      !Number.isFinite(Date.parse(from)) ||
      !Number.isFinite(Date.parse(until)) ||
      Date.parse(from) >= Date.parse(until)
    )
      throw new Error('Intervalo inválido.');
    const rows = await (
      await openDatabase()
    ).getAllAsync<Row>(
      projection +
        ` WHERE t.deleted_at IS NULL AND julianday(t.occurred_at)>=julianday(?) AND julianday(t.occurred_at)<julianday(?) ORDER BY julianday(t.occurred_at) DESC,t.id DESC`,
      from,
      until,
    );
    return rows.map(decode);
  },
};
