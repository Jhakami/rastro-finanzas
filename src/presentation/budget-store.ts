import { create } from 'zustand';
import type { Budget, BudgetProgress, SaveBudgetInput } from '@/domain/budgets';
import { planningRepository } from '@/infrastructure/budget-repository';
import { notifyBudgets } from '@/application/budget-notifications';

interface BudgetState {
  items: Budget[];
  progress: BudgetProgress[];
  error: string | null;
  loading: boolean;
  refresh(): Promise<void>;
  save(input: SaveBudgetInput, id?: string, allowOverlap?: boolean): Promise<void>;
  archive(id: string, enabled: boolean, allowOverlap?: boolean): Promise<void>;
  move(id: string, direction: 'up' | 'down'): Promise<void>;
}
let generation = 0;
export const useBudgetStore = create<BudgetState>((set, get) => ({
  items: [],
  progress: [],
  error: null,
  loading: true,
  async refresh() {
    const current = ++generation;
    try {
      const [items, progress] = await Promise.all([
        planningRepository.list(),
        planningRepository.progress(),
      ]);
      if (current !== generation) return;
      set({ items, progress, error: null, loading: false });
      void notifyBudgets(progress);
    } catch (cause) {
      if (current === generation)
        set({
          error: cause instanceof Error ? cause.message : 'No se cargaron los presupuestos.',
          loading: false,
        });
    }
  },
  async save(input, id, allowOverlap) {
    await planningRepository.save(input, id, allowOverlap);
    await get().refresh();
  },
  async archive(id, enabled, allowOverlap) {
    await planningRepository.setEnabled(id, enabled, allowOverlap);
    await get().refresh();
  },
  async move(id, direction) {
    await planningRepository.move(id, direction);
    await get().refresh();
  },
}));
