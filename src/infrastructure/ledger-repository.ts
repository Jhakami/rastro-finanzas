import type { LedgerRepository, TransactionQuery, TransactionPage } from '@/domain/ledger';
import type { FinanceTransaction } from '@/domain/types';
import { openDatabase } from './database';
import { LEDGER_PAGE_SQL, ledgerParameters } from './ledger-query';

export class SQLiteLedgerRepository implements LedgerRepository {
  async page(query: TransactionQuery): Promise<TransactionPage> {
    const params = ledgerParameters(query);
    const db = await openDatabase();
    const rows = await db.getAllAsync<
      FinanceTransaction & { tagIdsJson: string; locationJson: string | null }
    >(LEDGER_PAGE_SQL, params);
    const items = rows.slice(0, 50).map(({ tagIdsJson, locationJson, ...row }) => ({
      ...row,
      tagIds: JSON.parse(tagIdsJson) as string[],
      location: locationJson ? (JSON.parse(locationJson) as FinanceTransaction['location']) : null,
    }));
    const last = items.at(-1);
    return {
      items,
      nextCursor: rows.length > 50 && last ? { occurredAt: last.occurredAt, id: last.id } : null,
    };
  }
}
export const ledgerRepository: LedgerRepository = new SQLiteLedgerRepository();
