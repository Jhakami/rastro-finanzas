import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { startOfMonth } from 'date-fns';
import { calculateAccountBalances } from '@/application/balances';
import {
  buildInsights,
  calculateMetrics,
  DEFAULT_BEHAVIOR_SETTINGS,
  normalizeBehaviorSettings,
} from '@/application/analytics';
import type {
  Account,
  BehaviorSettings,
  Category,
  DashboardMetrics,
  FavoriteTemplate,
  FinanceTransaction,
  Insight,
  SpendingLimit,
} from '@/domain/types';
import {
  repository,
  type SaveAccountInput,
  type CreateTransactionInput,
  type SaveSpendingLimitInput,
} from '@/infrastructure/repository';

interface FinanceContextValue {
  accounts: Account[];
  allAccounts: Account[];
  categories: Category[];
  favorites: FavoriteTemplate[];
  limits: SpendingLimit[];
  transactions: FinanceTransaction[];
  monthlyTransactions: FinanceTransaction[];
  metrics: DashboardMetrics;
  insights: Insight[];
  balances: Record<string, number>;
  microThresholdCents: number;
  behaviorSettings: BehaviorSettings;
  loading: boolean;
  error: string | null;
  addTransaction(input: CreateTransactionInput): Promise<void>;
  addAccount(input: SaveAccountInput): Promise<string>;
  editAccount(id: string, input: SaveAccountInput): Promise<void>;
  moveAccount(id: string, direction: 'up' | 'down'): Promise<void>;
  setAccountArchived(id: string, archived: boolean): Promise<void>;
  addCategory(name: string, parentId: string): Promise<string>;
  deleteCategory(id: string): Promise<void>;
  deleteTransaction(id: string): Promise<void>;
  updateMicroThreshold(cents: number): Promise<void>;
  updateBehaviorSettings(settings: BehaviorSettings): Promise<void>;
  saveSpendingLimit(input: SaveSpendingLimitInput): Promise<void>;
  deleteSpendingLimit(id: string): Promise<void>;
  refresh(): Promise<void>;
}

const emptyMetrics = calculateMetrics([], 500);
const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [favorites, setFavorites] = useState<FavoriteTemplate[]>([]);
  const [limits, setLimits] = useState<SpendingLimit[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [microThresholdCents, setMicroThresholdCents] = useState(500);
  const [behaviorSettings, setBehaviorSettings] = useState(DEFAULT_BEHAVIOR_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [
        nextAccounts,
        nextCategories,
        nextFavorites,
        nextLimits,
        nextTransactions,
        threshold,
        savedBehaviorSettings,
      ] = await Promise.all([
        repository.listAccounts(true),
        repository.listCategories(),
        repository.listFavorites(),
        repository.listLimits(),
        repository.listTransactions(),
        repository.getSetting('microThresholdCents', '500'),
        repository.getSetting('behaviorSettings', JSON.stringify(DEFAULT_BEHAVIOR_SETTINGS)),
      ]);
      setAllAccounts(nextAccounts);
      setCategories(nextCategories);
      setFavorites(nextFavorites);
      setLimits(nextLimits);
      setTransactions(nextTransactions);
      setMicroThresholdCents(Number(threshold) || 500);
      try {
        setBehaviorSettings(normalizeBehaviorSettings(JSON.parse(savedBehaviorSettings)));
      } catch {
        setBehaviorSettings(DEFAULT_BEHAVIOR_SETTINGS);
      }
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

  const addAccount = useCallback(
    async (input: SaveAccountInput) => {
      const id = await repository.createAccount(input);
      await refresh();
      return id;
    },
    [refresh],
  );

  const editAccount = useCallback(
    async (id: string, input: SaveAccountInput) => {
      await repository.updateAccount(id, input);
      await refresh();
    },
    [refresh],
  );

  const moveAccount = useCallback(
    async (id: string, direction: 'up' | 'down') => {
      await repository.moveAccount(id, direction);
      await refresh();
    },
    [refresh],
  );

  const setAccountArchived = useCallback(
    async (id: string, archived: boolean) => {
      await repository.setAccountArchived(id, archived);
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

  const deleteCategory = useCallback(
    async (id: string) => {
      await repository.deleteCustomCategory(id);
      await refresh();
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

  const updateBehaviorSettings = useCallback(async (settings: BehaviorSettings) => {
    const normalized = normalizeBehaviorSettings(settings);
    await repository.setSetting('behaviorSettings', JSON.stringify(normalized));
    setBehaviorSettings(normalized);
  }, []);

  const saveSpendingLimit = useCallback(
    async (input: SaveSpendingLimitInput) => {
      await repository.saveSpendingLimit(input);
      await refresh();
    },
    [refresh],
  );

  const deleteSpendingLimit = useCallback(
    async (id: string) => {
      await repository.disableSpendingLimit(id);
      await refresh();
    },
    [refresh],
  );

  const monthlyTransactions = useMemo(() => {
    const boundary = startOfMonth(new Date()).getTime();
    return transactions.filter((item) => new Date(item.occurredAt).getTime() >= boundary);
  }, [transactions]);
  const accounts = useMemo(
    () => allAccounts.filter((account) => !account.isArchived),
    [allAccounts],
  );
  const metrics = useMemo(
    () => calculateMetrics(monthlyTransactions, microThresholdCents),
    [monthlyTransactions, microThresholdCents],
  );
  const insights = useMemo(
    () =>
      buildInsights(transactions, microThresholdCents, {
        settings: behaviorSettings,
        categories,
        limits,
      }),
    [transactions, microThresholdCents, behaviorSettings, categories, limits],
  );
  const balances = useMemo(
    () => calculateAccountBalances(allAccounts, transactions),
    [allAccounts, transactions],
  );

  const value = useMemo<FinanceContextValue>(
    () => ({
      accounts,
      allAccounts,
      categories,
      favorites,
      limits,
      transactions,
      monthlyTransactions,
      metrics,
      insights,
      balances,
      microThresholdCents,
      behaviorSettings,
      loading,
      error,
      addTransaction,
      addAccount,
      editAccount,
      moveAccount,
      setAccountArchived,
      addCategory,
      deleteCategory,
      deleteTransaction,
      updateMicroThreshold,
      updateBehaviorSettings,
      saveSpendingLimit,
      deleteSpendingLimit,
      refresh,
    }),
    [
      accounts,
      allAccounts,
      categories,
      favorites,
      limits,
      transactions,
      monthlyTransactions,
      metrics,
      insights,
      balances,
      microThresholdCents,
      behaviorSettings,
      loading,
      error,
      addTransaction,
      addAccount,
      editAccount,
      moveAccount,
      setAccountArchived,
      addCategory,
      deleteCategory,
      deleteTransaction,
      updateMicroThreshold,
      updateBehaviorSettings,
      saveSpendingLimit,
      deleteSpendingLimit,
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
