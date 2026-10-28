import { withWriteTransaction } from '../database';
import * as SQLite from 'expo-sqlite';
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => 'a'.repeat(64)),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device',
}));
jest.mock('drizzle-orm/expo-sqlite', () => ({ drizzle: jest.fn() }));
jest.mock('../schema', () => ({}));
it('initializes the SQLCipher key and foreign keys on each isolated write connection, committing or rolling back', async () => {
  const initial = {
    execAsync: jest.fn(),
    getFirstAsync: jest.fn(async () => ({ user_version: 7 })),
    runAsync: jest.fn(),
    withTransactionAsync: jest.fn(async (fn: () => Promise<void>) => fn()),
  };
  const tx = { execAsync: jest.fn(), closeAsync: jest.fn() };
  jest
    .mocked(SQLite.openDatabaseAsync)
    .mockResolvedValueOnce(initial as never)
    .mockResolvedValue(tx as never);
  await expect(
    withWriteTransaction(async (connection) => {
      expect(connection).toBe(tx);
      return 'saved';
    }),
  ).resolves.toBe('saved');
  expect(tx.execAsync.mock.calls[0]![0]).toContain('PRAGMA key');
  expect(tx.execAsync.mock.calls[1]![0]).toContain('foreign_keys=ON');
  expect(tx.execAsync.mock.calls[1]![0]).toContain('BEGIN IMMEDIATE');
  expect(tx.execAsync).toHaveBeenLastCalledWith('COMMIT');
  expect(tx.closeAsync).toHaveBeenCalledTimes(1);
  await expect(
    withWriteTransaction(async () => {
      throw new Error('conflict');
    }),
  ).rejects.toThrow('conflict');
  expect(tx.execAsync).toHaveBeenLastCalledWith('ROLLBACK');
  expect(tx.closeAsync).toHaveBeenCalledTimes(2);
});
