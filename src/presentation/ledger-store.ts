import { create } from 'zustand';
import type { LedgerRepository, TransactionCursor, TransactionQuery } from '@/domain/ledger';
import type { FinanceTransaction } from '@/domain/types';
import { ledgerRepository } from '@/infrastructure/ledger-repository';

interface LedgerState {
  query: TransactionQuery;
  items: FinanceTransaction[];
  cursor: TransactionCursor | null;
  loading: boolean;
  error: string | null;
  setQuery(query: TransactionQuery): Promise<void>;
  refresh(): Promise<void>;
  loadMore(): Promise<void>;
}
export function createLedgerStore(repository: LedgerRepository) {
  let version = 0;
  return create<LedgerState>((set, get) => ({
    query: {},
    items: [],
    cursor: null,
    loading: false,
    error: null,
    async setQuery(query) {
      set({ query: { ...query, cursor: undefined } });
      await get().refresh();
    },
    async refresh() {
      const request = ++version;
      set({ loading: true, error: null, items: [], cursor: null });
      try {
        const page = await repository.page(get().query);
        if (request === version)
          set({ items: page.items, cursor: page.nextCursor, loading: false });
      } catch (cause) {
        if (request === version)
          set({
            loading: false,
            error: cause instanceof Error ? cause.message : 'No se cargaron los movimientos.',
          });
      }
    },
    async loadMore() {
      const { loading, cursor, query } = get();
      if (loading || !cursor) return;
      const request = version;
      set({ loading: true, error: null });
      try {
        const page = await repository.page({ ...query, cursor });
        if (request === version) {
          const ids = new Set(get().items.map((item) => item.id));
          set({
            items: [...get().items, ...page.items.filter((item) => !ids.has(item.id))],
            cursor: page.nextCursor,
            loading: false,
          });
        }
      } catch (cause) {
        if (request === version)
          set({
            loading: false,
            error: cause instanceof Error ? cause.message : 'No se cargó la siguiente página.',
          });
      }
    },
  }));
}
export const useLedgerStore = createLedgerStore(ledgerRepository);
