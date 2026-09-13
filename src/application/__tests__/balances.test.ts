import { calculateAccountBalances } from '../balances';
import type { Account, FinanceTransaction } from '@/domain/types';

const accounts: Account[] = [
  {
    id: 'yape',
    name: 'Yape',
    color: '#000',
    initialBalanceCents: 1000,
    isDefault: true,
    isArchived: false,
    sortOrder: 0,
  },
  {
    id: 'bank',
    name: 'Banco',
    color: '#000',
    initialBalanceCents: 0,
    isDefault: false,
    isArchived: false,
    sortOrder: 1,
  },
];
const tx = (partial: Partial<FinanceTransaction>): FinanceTransaction => ({
  id: crypto.randomUUID(),
  kind: 'expense',
  amountCents: 100,
  accountId: 'yape',
  occurredAt: '2026-09-01T12:00:00.000Z',
  ...partial,
});

describe('calculateAccountBalances', () => {
  it('actualiza ingresos y gastos', () => {
    expect(
      calculateAccountBalances(accounts, [
        tx({ kind: 'income', amountCents: 500 }),
        tx({ amountCents: 200 }),
      ]),
    ).toEqual({ yape: 1300, bank: 0 });
  });

  it('una transferencia conserva el patrimonio total', () => {
    const result = calculateAccountBalances(accounts, [
      tx({ kind: 'transfer', amountCents: 300, destinationAccountId: 'bank' }),
    ]);
    expect(result).toEqual({ yape: 700, bank: 300 });
    expect(Object.values(result).reduce((sum, value) => sum + value, 0)).toBe(1000);
  });
});
