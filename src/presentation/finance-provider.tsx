import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useFavoriteStore } from './favorite-store';
import { useBudgetStore } from './budget-store';
import { useLedgerStore } from './ledger-store';
import { AppState } from 'react-native';
import { reportingRepository } from '@/infrastructure/reporting-repository';
import {
  calculateMetrics,
  DEFAULT_BEHAVIOR_SETTINGS,
  normalizeBehaviorSettings,
} from '@/application/analytics';
import type { Account, BehaviorSettings, Category, FavoriteTemplate, Tag } from '@/domain/types';
import {
  repository,
  type CorrectTransactionInput,
  type ReconcileAccountInput,
  type SaveAccountInput,
  type SaveCategoryInput,
  type CreateTransactionInput,
  type SaveTagInput,
} from '@/infrastructure/repository';

interface FinanceContextValue {
  accounts: Account[];
  allAccounts: Account[];
  categories: Category[];
  allCategories: Category[];
  tags: Tag[];
  allTags: Tag[];
  favorites: FavoriteTemplate[];
  recentCategoryIds: string[];
  revision: number;
  balances: Record<string, number>;
  microThresholdCents: number;
  behaviorSettings: BehaviorSettings;
  loading: boolean;
  error: string | null;
  addTransaction(input: CreateTransactionInput): Promise<void>;
  correctTransaction(id: string, input: CorrectTransactionInput): Promise<void>;
  reconcileAccount(id: string, input: ReconcileAccountInput): Promise<void>;
  addAccount(input: SaveAccountInput): Promise<string>;
  editAccount(id: string, input: SaveAccountInput): Promise<void>;
  moveAccount(id: string, direction: 'up' | 'down'): Promise<void>;
  setAccountArchived(id: string, archived: boolean): Promise<void>;
  addCategory(name: string, parentId: string): Promise<string>;
  editCategory(id: string, input: SaveCategoryInput): Promise<void>;
  moveCategory(id: string, direction: 'up' | 'down'): Promise<void>;
  setCategoryArchived(id: string, archived: boolean): Promise<void>;
  addTag(input: SaveTagInput): Promise<string>;
  editTag(id: string, input: SaveTagInput): Promise<void>;
  moveTag(id: string, direction: 'up' | 'down'): Promise<void>;
  setTagArchived(id: string, archived: boolean): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  deleteTransaction(id: string): Promise<void>;
  updateMicroThreshold(cents: number): Promise<void>;
  updateBehaviorSettings(settings: BehaviorSettings): Promise<void>;
  refresh(): Promise<void>;
}

const emptyMetrics = calculateMetrics([], 500);
const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [favorites, setFavorites] = useState<FavoriteTemplate[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [recentCategoryIds, setRecentCategoryIds] = useState<string[]>([]);
  const [revision, setRevision] = useState(0);
  const refreshVersion = useRef(0);
  const [microThresholdCents, setMicroThresholdCents] = useState(500);
  const [behaviorSettings, setBehaviorSettings] = useState(DEFAULT_BEHAVIOR_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const version = ++refreshVersion.current;
    try {
      setError(null);
      const [
        nextAccounts,
        nextAllCategories,
        nextFavorites,
        nextAllTags,
        nextBalances,
        nextRecentCategories,
        threshold,
        savedBehaviorSettings,
      ] = await Promise.all([
        repository.listAccounts(true),
        repository.listCategories(true),
        repository.listFavorites(),
        repository.listTags(true),
        reportingRepository.balances(),
        reportingRepository.recentCategories(),
        repository.getSetting('microThresholdCents', '500'),
        repository.getSetting('behaviorSettings', JSON.stringify(DEFAULT_BEHAVIOR_SETTINGS)),
      ]);
      if (version !== refreshVersion.current) return;
      setAllAccounts(nextAccounts);
      setAllCategories(nextAllCategories);
      setCategories(nextAllCategories.filter((category) => !category.isArchived));
      setFavorites(nextFavorites);
      setAllTags(nextAllTags);
      setBalances(nextBalances);
      setRecentCategoryIds(nextRecentCategories);
      setRevision((value) => value + 1);
      await useLedgerStore.getState().refresh();
      await useFavoriteStore.getState().refresh();
      await useBudgetStore.getState().refresh();
      if (version !== refreshVersion.current) return;
      setMicroThresholdCents(Number(threshold) || 500);
      try {
        setBehaviorSettings(normalizeBehaviorSettings(JSON.parse(savedBehaviorSettings)));
      } catch {
        setBehaviorSettings(DEFAULT_BEHAVIOR_SETTINGS);
      }
    } catch (cause) {
      if (version === refreshVersion.current)
        setError(cause instanceof Error ? cause.message : 'No se pudieron cargar tus datos.');
    } finally {
      if (version === refreshVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Bootstrap is intentionally driven by the external SQLite store.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    // Re-evaluate calendar boundaries even when the app remains open overnight.
    let day = new Date().toDateString();
    const timer = setInterval(() => {
      const nextDay = new Date().toDateString();
      if (nextDay !== day) {
        day = nextDay;
        setRevision((value) => value + 1);
      }
      void useBudgetStore.getState().refresh();
    }, 60_000);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [refresh]);

  const addTransaction = useCallback(
    async (input: CreateTransactionInput) => {
      await repository.createTransaction(input);
      await refresh();
    },
    [refresh],
  );

  const correctTransaction = useCallback(
    async (id: string, input: CorrectTransactionInput) => {
      await repository.correctTransaction(id, input);
      await refresh();
    },
    [refresh],
  );

  const reconcileAccount = useCallback(
    async (id: string, input: ReconcileAccountInput) => {
      await repository.reconcileAccount(id, input);
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

  const editCategory = useCallback(
    async (id: string, input: SaveCategoryInput) => {
      await repository.updateCustomCategory(id, input);
      await refresh();
    },
    [refresh],
  );

  const moveCategory = useCallback(
    async (id: string, direction: 'up' | 'down') => {
      await repository.moveCustomCategory(id, direction);
      await refresh();
    },
    [refresh],
  );

  const setCategoryArchived = useCallback(
    async (id: string, archived: boolean) => {
      await repository.setCustomCategoryArchived(id, archived);
      await refresh();
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

  const addTag = useCallback(
    async (input: SaveTagInput) => {
      const id = await repository.createTag(input);
      await refresh();
      return id;
    },
    [refresh],
  );

  const editTag = useCallback(
    async (id: string, input: SaveTagInput) => {
      await repository.updateTag(id, input);
      await refresh();
    },
    [refresh],
  );

  const moveTag = useCallback(
    async (id: string, direction: 'up' | 'down') => {
      await repository.moveTag(id, direction);
      await refresh();
    },
    [refresh],
  );

  const setTagArchived = useCallback(
    async (id: string, archived: boolean) => {
      await repository.setTagArchived(id, archived);
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

  const accounts = useMemo(
    () => allAccounts.filter((account) => !account.isArchived),
    [allAccounts],
  );
  const tags = useMemo(() => allTags.filter((tag) => !tag.isArchived), [allTags]);
  const value = useMemo<FinanceContextValue>(
    () => ({
      accounts,
      allAccounts,
      categories,
      allCategories,
      tags,
      allTags,
      favorites,
      recentCategoryIds,
      revision,
      balances,
      microThresholdCents,
      behaviorSettings,
      loading,
      error,
      addTransaction,
      correctTransaction,
      reconcileAccount,
      addAccount,
      editAccount,
      moveAccount,
      setAccountArchived,
      addCategory,
      editCategory,
      moveCategory,
      setCategoryArchived,
      addTag,
      editTag,
      moveTag,
      setTagArchived,
      deleteCategory,
      deleteTransaction,
      updateMicroThreshold,
      updateBehaviorSettings,
      refresh,
    }),
    [
      accounts,
      allAccounts,
      categories,
      allCategories,
      tags,
      allTags,
      favorites,
      recentCategoryIds,
      revision,
      balances,
      microThresholdCents,
      behaviorSettings,
      loading,
      error,
      addTransaction,
      correctTransaction,
      reconcileAccount,
      addAccount,
      editAccount,
      moveAccount,
      setAccountArchived,
      addCategory,
      editCategory,
      moveCategory,
      setCategoryArchived,
      addTag,
      editTag,
      moveTag,
      setTagArchived,
      deleteCategory,
      deleteTransaction,
      updateMicroThreshold,
      updateBehaviorSettings,
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
