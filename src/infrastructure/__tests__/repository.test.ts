import { LocalRepository } from '../repository';
import { openDatabase } from '../database';

jest.mock('../database', () => ({ openDatabase: jest.fn() }));

describe('LocalRepository.deleteCustomCategory', () => {
  it('ignora referencias de movimientos borrados y las reclasifica antes de eliminar', async () => {
    const runAsync = jest.fn().mockResolvedValue({ changes: 1 });
    const getFirstAsync = jest
      .fn()
      .mockResolvedValueOnce({
        id: 'category-custom-test',
        name: 'Prueba',
        icon: 'pricetag',
        color: '#fff',
        parentId: 'category-food',
      })
      .mockResolvedValueOnce({ total: 0 })
      .mockResolvedValueOnce({ total: 1 });
    const database = {
      getFirstAsync,
      runAsync,
      withTransactionAsync: jest.fn(async (operation: () => Promise<void>) => operation()),
    };
    jest.mocked(openDatabase).mockResolvedValue(database as never);

    await new LocalRepository().deleteCustomCategory('category-custom-test');

    expect(getFirstAsync.mock.calls[1]?.[0]).toContain('deleted_at IS NULL');
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("SET category_id='category-other'"),
      expect.any(String),
      'category-custom-test',
    );
    expect(runAsync).toHaveBeenCalledWith(
      'DELETE FROM categories WHERE id=?',
      'category-custom-test',
    );
  });
});

describe('LocalRepository.createTransaction', () => {
  it('incrementa el uso del favorito elegido dentro de la misma transacción', async () => {
    const runAsync = jest.fn().mockResolvedValue({ changes: 1 });
    const database = {
      runAsync,
      withTransactionAsync: jest.fn(async (operation: () => Promise<void>) => operation()),
    };
    jest.mocked(openDatabase).mockResolvedValue(database as never);

    await new LocalRepository().createTransaction({
      kind: 'expense',
      amountCents: 250,
      accountId: 'account-yape',
      categoryId: 'category-food-water',
      favoriteId: 'favorite-water',
    });

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('usage_count=usage_count+1'),
      'favorite-water',
    );
  });
});

describe('LocalRepository.listFavorites', () => {
  it('prioriza categorías frecuentes reales y completa hasta tres con accesos iniciales', async () => {
    const getAllAsync = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'adaptive-category-games',
          name: 'Videojuegos',
          accountId: 'account-bank',
          categoryId: 'category-games',
          usageCount: 4,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'favorite-water',
          name: 'Agua',
          accountId: 'account-yape',
          categoryId: 'category-food-water',
          usageCount: 0,
        },
        {
          id: 'favorite-games',
          name: 'Juegos',
          accountId: 'account-bank',
          categoryId: 'category-games',
          usageCount: 0,
        },
        {
          id: 'favorite-pasaje',
          name: 'Pasaje',
          accountId: 'account-yape',
          categoryId: 'category-transport-public',
          usageCount: 0,
        },
      ]);
    jest.mocked(openDatabase).mockResolvedValue({ getAllAsync } as never);

    const favorites = await new LocalRepository().listFavorites();

    expect(getAllAsync.mock.calls[0]?.[0]).toContain("t.kind='expense'");
    expect(getAllAsync.mock.calls[0]?.[0]).toContain('t.deleted_at IS NULL');
    expect(getAllAsync.mock.calls[0]?.[0]).toContain('COUNT(*) OVER');
    expect(favorites.map((favorite) => favorite.id)).toEqual([
      'adaptive-category-games',
      'favorite-water',
      'favorite-pasaje',
    ]);
  });
});
