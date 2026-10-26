import { SQLiteFavoriteRepository } from '../favorite-repository';
import { openDatabase } from '../database';
import type { SaveFavoriteInput } from '@/domain/favorites';
jest.mock('../database', () => ({ openDatabase: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'favorite-new') }));
const input: SaveFavoriteInput = {
  name: 'Pasaje',
  accountId: 'cash',
  categoryId: 'transport',
  amountMode: 'fixed',
  amountCents: 250,
  merchant: null,
  note: null,
  tagIds: ['work'],
};
function database() {
  const db = {
    runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
    getFirstAsync: jest.fn().mockResolvedValue({ id: 'exists' }),
    getAllAsync: jest.fn(),
    withTransactionAsync: jest.fn(async (fn: () => Promise<void>) => fn()),
  };
  jest.mocked(openDatabase).mockResolvedValue(db as never);
  return db;
}
describe('manual favorites', () => {
  it('edits only the template and its tags, leaving movements unchanged', async () => {
    const db = database();
    await new SQLiteFavoriteRepository().save(input, 'favorite-existing');
    expect(
      db.runAsync.mock.calls.some(([sql]) =>
        /UPDATE transactions|DELETE FROM transactions/.test(sql),
      ),
    ).toBe(false);
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO favorite_tags'),
      'favorite-existing',
      'work',
    );
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO audit_events'),
      expect.any(String),
      'favorite',
      'favorite-existing',
      'updated',
      expect.any(String),
      expect.any(String),
    );
  });
  it('rejects archived references before writing', async () => {
    const db = database();
    db.getFirstAsync.mockResolvedValueOnce(null);
    await expect(new SQLiteFavoriteRepository().save(input)).rejects.toThrow();
    expect(db.runAsync).not.toHaveBeenCalled();
  });
  it('restores to end and audits without deleting records', async () => {
    const db = database();
    db.getFirstAsync.mockResolvedValueOnce({ isArchived: 1 });
    await new SQLiteFavoriteRepository().setArchived('f', false);
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('sort_order=CASE'),
      0,
      expect.any(String),
      0,
      'f',
    );
  });
  it('reorders ties deterministically and keeps both entries', async () => {
    const db = database();
    db.getAllAsync.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    await new SQLiteFavoriteRepository().move('b', 'up');
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('SET sort_order'),
      0,
      expect.any(String),
      'b',
    );
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('SET sort_order'),
      1,
      expect.any(String),
      'a',
    );
  });
});
