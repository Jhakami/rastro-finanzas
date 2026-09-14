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
