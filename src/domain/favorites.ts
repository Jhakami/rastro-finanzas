import type { FavoriteTemplate } from './types';

export type FavoriteOrder = 'manual' | 'recent' | 'frequency';
export type FavoriteAmountMode = 'fixed' | 'suggested' | 'variable';
export interface ManualFavorite extends FavoriteTemplate {
  amountMode: FavoriteAmountMode;
  tagIds: string[];
  sortOrder: number;
  isArchived: boolean;
  lastUsedAt: string | null;
  available: boolean;
}
export interface SaveFavoriteInput {
  name: string;
  accountId: string;
  categoryId: string;
  amountMode: FavoriteAmountMode;
  amountCents: number | null;
  merchant: string | null;
  note: string | null;
  tagIds: string[];
}
export interface FavoriteRepository {
  list(order?: FavoriteOrder): Promise<ManualFavorite[]>;
  save(input: SaveFavoriteInput, id?: string): Promise<string>;
  move(id: string, direction: 'up' | 'down'): Promise<void>;
  setArchived(id: string, archived: boolean): Promise<void>;
}

export function normalizeFavorite(input: SaveFavoriteInput): SaveFavoriteInput {
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 40)
    throw new Error('El nombre debe tener entre 2 y 40 caracteres.');
  if (!input.accountId || !input.categoryId) throw new Error('Elige cuenta y categoría.');
  if (!['fixed', 'suggested', 'variable'].includes(input.amountMode))
    throw new Error('Elige un modo de monto válido.');
  if (
    input.amountMode !== 'variable' &&
    (!Number.isSafeInteger(input.amountCents) || (input.amountCents ?? 0) <= 0)
  ) {
    throw new Error('Escribe un monto mayor a cero con hasta dos decimales.');
  }
  return {
    ...input,
    name,
    amountCents: input.amountMode === 'variable' ? null : input.amountCents,
    merchant: input.merchant?.trim() || null,
    note: input.note?.trim() || null,
    tagIds: [...new Set(input.tagIds)],
  };
}
