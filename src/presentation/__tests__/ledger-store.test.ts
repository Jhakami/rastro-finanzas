import { createLedgerStore } from '../ledger-store';
import type { TransactionPage } from '@/domain/ledger';
import type { FinanceTransaction } from '@/domain/types';
jest.mock('@/infrastructure/ledger-repository', () => ({ ledgerRepository: { page: jest.fn() } }));
const item = (id: string): FinanceTransaction => ({
  id,
  kind: 'expense',
  accountId: 'cash',
  amountCents: 100,
  occurredAt: '2026-10-01T00:00:00Z',
});
function deferred() {
  let resolve!: (page: TransactionPage) => void;
  const promise = new Promise<TransactionPage>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
it('discards late filter responses', async () => {
  const first = deferred();
  const page = jest
    .fn()
    .mockReturnValueOnce(first.promise)
    .mockResolvedValueOnce({ items: [item('new')], nextCursor: null });
  const store = createLedgerStore({ page });
  const pending = store.getState().setQuery({ text: 'old' });
  await store.getState().setQuery({ text: 'new' });
  first.resolve({ items: [item('old')], nextCursor: null });
  await pending;
  expect(store.getState().items.map((i) => i.id)).toEqual(['new']);
});
it('guards duplicate load more and discards stale page after refresh', async () => {
  const more = deferred();
  const page = jest
    .fn()
    .mockResolvedValueOnce({
      items: [item('one')],
      nextCursor: { occurredAt: item('one').occurredAt, id: 'one' },
    })
    .mockReturnValueOnce(more.promise)
    .mockResolvedValueOnce({ items: [item('updated')], nextCursor: null });
  const store = createLedgerStore({ page });
  await store.getState().refresh();
  const pending = store.getState().loadMore();
  await store.getState().loadMore();
  expect(page).toHaveBeenCalledTimes(2);
  await store.getState().refresh();
  more.resolve({ items: [item('late')], nextCursor: null });
  await pending;
  expect(store.getState().items.map((i) => i.id)).toEqual(['updated']);
});
it('preserves items/cursor on page failure and allows retry', async () => {
  const cursor = { occurredAt: item('one').occurredAt, id: 'one' };
  const page = jest
    .fn()
    .mockResolvedValueOnce({ items: [item('one')], nextCursor: cursor })
    .mockRejectedValueOnce(new Error('offline db'))
    .mockResolvedValueOnce({ items: [item('one'), item('two')], nextCursor: null });
  const store = createLedgerStore({ page });
  await store.getState().refresh();
  await store.getState().loadMore();
  expect(store.getState()).toMatchObject({ error: 'offline db', cursor, loading: false });
  await store.getState().loadMore();
  expect(store.getState().items.map((i) => i.id)).toEqual(['one', 'two']);
});
