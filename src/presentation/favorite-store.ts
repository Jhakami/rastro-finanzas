import { create } from 'zustand';
import type { FavoriteOrder, ManualFavorite, SaveFavoriteInput } from '@/domain/favorites';
import { favoriteRepository } from '@/infrastructure/favorite-repository';

interface FavoriteState {
  items: ManualFavorite[];
  order: FavoriteOrder;
  error: string | null;
  refresh(): Promise<void>;
  setOrder(order: FavoriteOrder): Promise<void>;
  save(input: SaveFavoriteInput, id?: string): Promise<void>;
  move(id: string, direction: 'up' | 'down'): Promise<void>;
  archive(id: string, archived: boolean): Promise<void>;
}

// A late read must not replace data from a newer mutation or ordering request.
let readVersion = 0;
export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  items: [],
  order: 'manual',
  error: null,
  async refresh() {
    const version = ++readVersion;
    try {
      const items = await favoriteRepository.list(get().order);
      if (version === readVersion) set({ items, error: null });
    } catch (cause) {
      if (version === readVersion)
        set({ error: cause instanceof Error ? cause.message : 'No se cargaron los favoritos.' });
    }
  },
  async setOrder(order) {
    set({ order });
    await get().refresh();
  },
  async save(input, id) {
    await favoriteRepository.save(input, id);
    await get().refresh();
  },
  async move(id, direction) {
    await favoriteRepository.move(id, direction);
    await get().refresh();
  },
  async archive(id, archived) {
    await favoriteRepository.setArchived(id, archived);
    await get().refresh();
  },
}));
