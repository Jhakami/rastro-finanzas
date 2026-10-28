import { SQLitePlanningRepository } from '../budget-repository';
import { openDatabase, withWriteTransaction } from '../database';
import { BudgetOverlapError, type SaveBudgetInput } from '@/domain/budgets';
jest.mock('../database', () => ({ openDatabase: jest.fn(), withWriteTransaction: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'new-budget') }));
const input: SaveBudgetInput = {
  name: 'Comida',
  amountCents: 10000,
  warningPercent: 80,
  period: 'monthly',
  notify: false,
  scope: { accountIds: ['cash'], categoryIds: ['food'], tagIds: [] },
};
const row = {
  id: 'existing',
  ...input,
  enabled: 1,
  sortOrder: 0,
  accountsJson: '["cash"]',
  categoriesJson: '["food"]',
  tagsJson: '[]',
};
function mockDb() {
  const db = {
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue({ isArchived: 0 }),
    runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
  };
  jest.mocked(openDatabase).mockResolvedValue(db as never);
  jest.mocked(withWriteTransaction).mockImplementation(async (operation) => operation(db as never));
  return db;
}
it('requires explicit confirmation before overlapping writes', async () => {
  const db = mockDb();
  db.getAllAsync
    .mockResolvedValueOnce([{ id: 'food', parentId: null }])
    .mockResolvedValueOnce([row]);
  await expect(new SQLitePlanningRepository().save(input)).rejects.toBeInstanceOf(
    BudgetOverlapError,
  );
  expect(db.runAsync).not.toHaveBeenCalled();
});
it('saves confirmed scopes and audit without modifying movements', async () => {
  const db = mockDb();
  await new SQLitePlanningRepository().save(input, undefined, true);
  expect(db.runAsync).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO budget_accounts'),
    'new-budget',
    'cash',
  );
  expect(db.runAsync).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO audit_events'),
    expect.any(String),
    'budget',
    'new-budget',
    'created',
    expect.stringContaining('"overlapConfirmed":true'),
    expect.any(String),
  );
  expect(
    db.runAsync.mock.calls.some(([sql]) =>
      /UPDATE transactions|DELETE FROM transactions/.test(sql),
    ),
  ).toBe(false);
});
it('prevents new archived references while retaining existing historical ones', async () => {
  const db = mockDb();
  db.getFirstAsync.mockResolvedValue({ isArchived: 1 });
  await expect(new SQLitePlanningRepository().save(input, undefined, true)).rejects.toThrow(
    'referencias activas',
  );
  db.getAllAsync.mockResolvedValue([row]);
  await expect(new SQLitePlanningRepository().save(input, 'existing', true)).resolves.toBe(
    'existing',
  );
});
it('checks overlap again when restoring an archived budget', async () => {
  const db = mockDb();
  db.getAllAsync
    .mockResolvedValueOnce([{ ...row, id: 'restore', enabled: 0 }])
    .mockResolvedValueOnce([{ id: 'food', parentId: null }])
    .mockResolvedValueOnce([row]);
  await expect(new SQLitePlanningRepository().setEnabled('restore', true)).rejects.toBeInstanceOf(
    BudgetOverlapError,
  );
  expect(db.runAsync).not.toHaveBeenCalled();
});
