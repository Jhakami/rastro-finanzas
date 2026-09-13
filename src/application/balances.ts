import type { Account, FinanceTransaction } from '@/domain/types';
import { signedEffect } from '@/domain/money';

export function calculateAccountBalances(
  accounts: Account[],
  transactions: FinanceTransaction[],
): Record<string, number> {
  const balances = Object.fromEntries(
    accounts.map((account) => [account.id, account.initialBalanceCents]),
  );
  transactions
    .filter((item) => !item.deletedAt)
    .forEach((item) => {
      if (item.kind === 'transfer') {
        balances[item.accountId] = (balances[item.accountId] ?? 0) - Math.abs(item.amountCents);
        if (item.destinationAccountId) {
          balances[item.destinationAccountId] =
            (balances[item.destinationAccountId] ?? 0) + Math.abs(item.amountCents);
        }
        return;
      }
      balances[item.accountId] =
        (balances[item.accountId] ?? 0) + signedEffect(item.kind, item.amountCents);
    });
  return balances;
}
