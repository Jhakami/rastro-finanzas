import { act, fireEvent, render, screen } from '@testing-library/react-native';
import AuditScreen from '../../../app/audit';
import { auditRepository } from '@/infrastructure/audit-repository';
import { useFinance } from '../finance-provider';
jest.mock('@/infrastructure/audit-repository', () => ({
  auditRepository: { page: jest.fn(), deletedPage: jest.fn(), restoreTransaction: jest.fn() },
}));
jest.mock('../finance-provider', () => ({ useFinance: jest.fn() }));
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    router: { back: jest.fn() },
    useFocusEffect: (callback: () => void) => useEffect(callback, [callback]),
  };
});
const refresh = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useFinance).mockReturnValue({ revision: 0, refresh } as never);
  jest.mocked(auditRepository.page).mockResolvedValue({
    items: [
      {
        id: 'event',
        entityType: 'transaction',
        entityId: 't',
        action: 'deleted',
        payload: null,
        occurredAt: '2026-01-01T00:00:00Z',
      },
    ],
    nextCursor: null,
  });
  jest.mocked(auditRepository.deletedPage).mockResolvedValue({
    items: [
      {
        id: 't',
        kind: 'expense',
        amountCents: 200,
        accountName: 'Efectivo',
        accountArchived: 1,
        destinationName: null,
        categoryName: 'Comida',
        categoryArchived: 1,
        occurredAt: '2026-01-01T00:00:00Z',
        deletedAt: '2026-02-01T00:00:00Z',
      },
    ],
    nextCursor: null,
  });
});
it('bloquea doble confirmación mientras la restauración está pendiente', async () => {
  let finish!: (value: boolean) => void;
  jest.mocked(auditRepository.restoreTransaction).mockReturnValueOnce(
    new Promise<boolean>((resolve) => {
      finish = resolve;
    }),
  );
  await render(<AuditScreen />);
  await fireEvent.press(screen.getByText('Eliminados'));
  await fireEvent.press(await screen.findByText('Restaurar', { exact: true }));
  await fireEvent.changeText(screen.getByLabelText('Motivo de restauración'), 'Recuperar');
  await fireEvent.press(screen.getByText('Confirmar restauración'));
  await fireEvent.press(screen.getByText('Restaurando…'));
  expect(auditRepository.restoreTransaction).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish(true);
  });
  expect(await screen.findByText('Movimiento restaurado.')).toBeTruthy();
});
it('muestra eventos antiguos sin inventar detalles y conserva el motivo ante fallo', async () => {
  await render(<AuditScreen />);
  expect(await screen.findByText('Este evento no conserva detalles adicionales.')).toBeTruthy();
  await fireEvent.press(screen.getByText('Eliminados'));
  await fireEvent.press(await screen.findByText('Restaurar', { exact: true }));
  await fireEvent.press(screen.getByText('Confirmar restauración'));
  expect(screen.getByText('Escribe el motivo de restauración.')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Motivo de restauración'), 'Me equivoqué');
  jest.mocked(auditRepository.restoreTransaction).mockRejectedValueOnce(new Error('Sin espacio'));
  await fireEvent.press(screen.getByText('Confirmar restauración'));
  expect(await screen.findByText('Sin espacio')).toBeTruthy();
  expect(screen.getByDisplayValue('Me equivoqué')).toBeTruthy();
  jest.mocked(auditRepository.restoreTransaction).mockResolvedValueOnce(true);
  await fireEvent.press(screen.getByText('Confirmar restauración'));
  expect(await screen.findByText('Movimiento restaurado.')).toBeTruthy();
  expect(refresh).toHaveBeenCalledTimes(1);
});
