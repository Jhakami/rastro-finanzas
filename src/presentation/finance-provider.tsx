import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { startOfMonth } from 'date-fns';
import { calculateAccountBalances } from '@/application/balances';
import { buildInsights, calculateMetrics } from '@/application/analytics';
import type {
  Account,
  Category,
  DashboardMetrics,
  FavoriteTemplate,
  FinanceTransaction,
  Insight,
  SpendingLimit,
} from '@/domain/types';
import { repository, type CreateTransactionInput } from '@/infrastructure/repository';

interface FinanceContextValue {
  accounts: Account[];
  categories: Category[];
  favorites: FavoriteTemplate[];
  limits: SpendingLimit[];
  transactions: FinanceTransaction[];
  monthlyTransactions: FinanceTransaction[];
  metrics: DashboardMetrics;
  insights: Insight[];
  balances: Record<string, number>;
  microThresholdCents: number;
  loading: boolean;
  error: string | null;
  addTransaction(input: CreateTransactionInput): Promise<void>;
  addCategory(name: string, parentId: string): Promise<string>;
  deleteTransaction(id: string): Promise<void>;
  updateMicroThreshold(cents: number): Promise<void>;
  refresh(): Promise<void>;
}

const emptyMetrics = calculateMetrics([], 500);
const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [favorites, setFavorites] = useState<FavoriteTemplate[]>([]);
  const [limits, setLimits] = useState<SpendingLimit[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [microThresholdCents, setMicroThresholdCents] = useState(500);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [nextAccounts, nextCategories, nextFavorites, nextLimits, nextTransactions, threshold] =
        await Promise.all([
          repository.listAccounts(),
          repository.listCategories(),
          repository.listFavorites(),
          repository.listLimits(),
          repository.listTransactions(),
          repository.getSetting('microThresholdCents', '500'),
        ]);
      setAccounts(nextAccounts);
      setCategories(nextCategories);
      setFavorites(nextFavorites);
      setLimits(nextLimits);
      setTransactions(nextTransactions);
      setMicroThresholdCents(Number(threshold) || 500);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar tus datos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Bootstrap is intentionally driven by the external SQLite store.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const addTransaction = useCallback(
    async (input: CreateTransactionInput) => {
      await repository.createTransaction(input);
      await refresh();
    },
    [refresh],
  );

  const addCategory = useCallback(
    async (name: string, parentId: string) => {
      const id = await repository.createCategory(name, parentId);
      await refresh();
      return id;
    },
    [refresh],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      await repository.softDeleteTransaction(id);
      await refresh();
    },
    [refresh],
  );

  const updateMicroThreshold = useCallback(async (cents: number) => {
    await repository.setSetting('microThresholdCents', String(cents));
    setMicroThresholdCents(cents);
  }, []);

  const monthlyTransactions = useMemo(() => {
    const boundary = startOfMonth(new Date()).getTime();
    return transactions.filter((item) => new Date(item.occurredAt).getTime() >= boundary);
  }, [transactions]);
  const metrics = useMemo(
    () => calculateMetrics(monthlyTransactions, microThresholdCents),
    [monthlyTransactions, microThresholdCents],
  );
  const insights = useMemo(
    () => buildInsights(transactions, microThresholdCents),
    [transactions, microThresholdCents],
  );
  const balances = useMemo(
    () => calculateAccountBalances(accounts, transactions),
    [accounts, transactions],
  );

  const value = useMemo<FinanceContextValue>(
    () => ({
      accounts,
      categories,
      favorites,
      limits,
      transactions,
      monthlyTransactions,
      metrics,
      insights,
      balances,
      microThresholdCents,
      loading,
      error,
      addTransaction,
      addCategory,
      deleteTransaction,
      updateMicroThreshold,
      refresh,
    }),
    [
      accounts,
      categories,
      favorites,
      limits,
      transactions,
      monthlyTransactions,
      metrics,
      insights,
      balances,
      microThresholdCents,
      loading,
      error,
      addTransaction,
      addCategory,
      deleteTransaction,
      updateMicroThreshold,
      refresh,
    ],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextValue {
  const value = useContext(FinanceContext);
  if (!value) throw new Error('useFinance debe usarse dentro de FinanceProvider.');
  return value;
}

export { emptyMetrics };
