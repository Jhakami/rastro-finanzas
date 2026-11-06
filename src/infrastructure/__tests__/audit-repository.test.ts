import { openDatabase, withWriteTransaction } from '../database';
import { SQLiteAuditRepository } from '../audit-repository';

jest.mock('../database', () => ({ openDatabase: jest.fn(), withWriteTransaction: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'audit-uuid' }));

const repository = new SQLiteAuditRepository();
const runAsync = jest.fn();
const getFirstAsync = jest.fn();
const getAllAsync = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  runAsync.mockResolvedValue({ changes: 1 });
  jest.mocked(openDatabase).mockResolvedValue({ getAllAsync } as never);
  jest
    .mocked(withWriteTransaction)
    .mockImplementation(async (operation) => operation({ runAsync, getFirstAsync } as never));
});

it('restaura la misma fila y audita el motivo dentro de una única transacción', async () => {
  getFirstAsync.mockResolvedValue({ deletedAt: '2026-10-01T00:00:00Z' });
  await expect(repository.restoreTransaction('movement', '  Borrado accidental  ')).resolves.toBe(
    true,
  );
  expect(withWriteTransaction).toHaveBeenCalledTimes(1);
  expect(runAsync).toHaveBeenNthCalledWith(
    1,
    'UPDATE transactions SET deleted_at=NULL,updated_at=? WHERE id=? AND deleted_at IS NOT NULL',
    expect.any(String),
    'movement',
  );
  expect(runAsync).toHaveBeenNthCalledWith(
    2,
    expect.stringContaining('INSERT INTO audit_events'),
    'audit-uuid',
    'transaction',
    'movement',
    'restored',
    JSON.stringify({ reason: 'Borrado accidental', deletedAt: '2026-10-01T00:00:00Z' }),
    expect.any(String),
  );
});

it('no escribe ni audita si el movimiento ya está activo', async () => {
  getFirstAsync.mockResolvedValue({ deletedAt: null });
  await expect(repository.restoreTransaction('movement', 'Recuperar')).resolves.toBe(false);
  expect(runAsync).not.toHaveBeenCalled();
});

it('rechaza un movimiento inexistente y un motivo vacío', async () => {
  getFirstAsync.mockResolvedValue(null);
  await expect(repository.restoreTransaction('missing', 'Recuperar')).rejects.toThrow(
    'ya no existe',
  );
  await expect(repository.restoreTransaction('movement', '   ')).rejects.toThrow('motivo');
  expect(runAsync).not.toHaveBeenCalled();
});

it('propaga el fallo de auditoría para que la transacción revierta la restauración', async () => {
  getFirstAsync.mockResolvedValue({ deletedAt: '2026-10-01T00:00:00Z' });
  runAsync.mockResolvedValueOnce({ changes: 1 }).mockRejectedValueOnce(new Error('disk full'));
  await expect(repository.restoreTransaction('movement', 'Recuperar')).rejects.toThrow('disk full');
});

it('pagina 50 eventos con desempate por ID sin devolver la fila de anticipación', async () => {
  const rows = Array.from({ length: 51 }, (_, i) => ({
    id: String(100 - i),
    occurredAt: '2026-10-01T00:00:00Z',
    entityType: 'transaction',
    entityId: 'movement',
    action: 'deleted',
    payload: null,
  }));
  getAllAsync.mockResolvedValue(rows);
  const page = await repository.page();
  expect(page.items).toHaveLength(50);
  expect(page.nextCursor).toEqual({ id: '51', occurredAt: rows[0]!.occurredAt });
  await repository.page(page.nextCursor);
  expect(getAllAsync).toHaveBeenLastCalledWith(expect.stringContaining('LIMIT 51'), {
    $date: rows[0]!.occurredAt,
    $id: '51',
  });
});

it('rechaza cursores inválidos antes de consultar SQLite', async () => {
  await expect(repository.page({ id: 'x', occurredAt: 'invalid' })).rejects.toThrow('Cursor');
  expect(openDatabase).not.toHaveBeenCalled();
});
