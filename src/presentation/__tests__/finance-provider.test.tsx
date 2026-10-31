import { act, render } from '@testing-library/react-native';
import { FinanceProvider, useFinance } from '../finance-provider';
import { repository } from '@/infrastructure/repository';
import { reportingRepository } from '@/infrastructure/reporting-repository';
jest.mock('@/infrastructure/repository', () => ({
  repository: {
    listAccounts: jest.fn(async () => []),
    listCategories: jest.fn(async () => []),
    listTags: jest.fn(async () => []),
    listFavorites: jest.fn(async () => []),
    listTransactions: jest.fn(() => {
      throw new Error('Global history must not load');
    }),
    getSetting: jest.fn(async (_key: string, fallback: string) => fallback),
    createTransaction: jest.fn(async () => 'new'),
  },
}));
jest.mock('@/infrastructure/reporting-repository', () => ({
  reportingRepository: {
    balances: jest.fn(async () => ({ cash: 100 })),
    recentCategories: jest.fn(async () => ['food']),
  },
}));
jest.mock('../favorite-store', () => ({
  useFavoriteStore: { getState: () => ({ refresh: async () => {} }) },
}));
jest.mock('../budget-store', () => ({
  useBudgetStore: { getState: () => ({ refresh: async () => {} }) },
}));
jest.mock('../ledger-store', () => ({
  useLedgerStore: { getState: () => ({ refresh: async () => {} }) },
}));
it('bootstrap and a transaction mutation only request catalogs/SQL aggregates, not global history', async () => {
  let finance!: ReturnType<typeof useFinance>;
  function Consumer() {
    finance = useFinance();
    return null;
  }
  await render(
    <FinanceProvider>
      <Consumer />
    </FinanceProvider>,
  );
  await act(async () => {});
  expect(finance.balances).toEqual({ cash: 100 });
  expect(finance.recentCategoryIds).toEqual(['food']);
  const previous = finance.revision;
  await act(async () => {
    await finance.addTransaction({
      kind: 'expense',
      accountId: 'cash',
      categoryId: 'food',
      amountCents: 100,
    });
  });
  expect(finance.revision).toBeGreaterThan(previous);
  expect(reportingRepository.balances).toHaveBeenCalledTimes(2);
  expect(repository.listTransactions).not.toHaveBeenCalled();
  expect('transactions' in finance).toBe(false);
});
