import { act, fireEvent, render, screen } from '@testing-library/react-native';
import MovementsScreen from '../../../app/(tabs)/movements';
import AccountDetailScreen from '../../../app/account-detail';
import { useFinance } from '../finance-provider';
import { useLedgerStore } from '../ledger-store';
import { ledgerRepository } from '@/infrastructure/ledger-repository';
import { router, useLocalSearchParams } from 'expo-router';
jest.mock('../finance-provider', () => ({ useFinance: jest.fn() }));
jest.mock('@/infrastructure/ledger-repository', () => ({ ledgerRepository: { page: jest.fn() } }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  const { useEffect } = jest.requireActual('react');
  return {
    router: { push: jest.fn(), back: jest.fn() },
    useLocalSearchParams: jest.fn(() => ({})),
    useFocusEffect: (callback: () => void) => useEffect(callback, [callback]),
    Link: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
      asChild ? children : <Text>{children}</Text>,
  };
});
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useLocalSearchParams).mockReturnValue({});
  jest.mocked(useFinance).mockReturnValue({
    allAccounts: [
      { id: 'cash', name: 'Efectivo', isArchived: false },
      { id: 'old', name: 'Antigua', isArchived: true },
    ],
    allCategories: [{ id: 'food', name: 'Comida' }],
    allTags: [{ id: 'a', name: 'Viaje' }],
    balances: { cash: 1500, old: 2500 },
    loading: false,
    deleteTransaction: jest.fn(),
  } as never);
  jest.mocked(ledgerRepository.page).mockResolvedValue({ items: [], nextCursor: null });
  useLedgerStore.setState({ query: {}, items: [], cursor: null, loading: false, error: null });
});
it('combines account/type/text/category/tag/dates, rejects invalid dates without losing input', async () => {
  await render(<MovementsScreen />);
  await fireEvent.changeText(
    screen.getByPlaceholderText('Buscar comercio, nota, categoría o etiqueta'),
    'agua',
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Gastos' }));
  await fireEvent.press(screen.getByText('Cuenta, fechas y etiquetas'));
  await fireEvent.press(screen.getByText('Antigua (archivada)'));
  await fireEvent.press(screen.getByText('Comida'));
  await fireEvent.press(screen.getByText('Viaje'));
  await fireEvent.changeText(screen.getByLabelText('Desde, AAAA-MM-DD'), '2026-02-30');
  await fireEvent.press(screen.getByText('Aplicar filtros'));
  expect(screen.getByText('La fecha no existe.')).toBeTruthy();
  expect(screen.getByDisplayValue('agua')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Desde, AAAA-MM-DD'), '2026-02-01');
  await fireEvent.changeText(screen.getByLabelText('Hasta, AAAA-MM-DD'), '2026-02-28');
  await fireEvent.press(screen.getByText('Aplicar filtros'));
  expect(useLedgerStore.getState().query).toMatchObject({
    text: 'agua',
    accountId: 'old',
    kind: 'expense',
    categoryId: 'food',
    tagIds: ['a'],
  });
  expect(new Date(useLedgerStore.getState().query.until!).getMonth()).toBe(2);
  await fireEvent.press(screen.getByText('Limpiar'));
  expect(useLedgerStore.getState().query.accountId).toBeUndefined();
  expect(screen.getByText('+ Registrar gasto')).toBeTruthy();
});
it('loads next page and opens correction by id', async () => {
  const one = {
    id: 'one',
    kind: 'expense' as const,
    accountId: 'cash',
    amountCents: 100,
    occurredAt: '2026-10-01T12:00:00Z',
    merchant: 'Agua',
  };
  jest
    .mocked(ledgerRepository.page)
    .mockResolvedValueOnce({ items: [one], nextCursor: { id: 'one', occurredAt: one.occurredAt } })
    .mockResolvedValueOnce({ items: [{ ...one, id: 'two', merchant: 'Pan' }], nextCursor: null });
  await render(<MovementsScreen />);
  await act(async () => {});
  await fireEvent.press(screen.getByText('Cargar 50 más'));
  expect(screen.getByText('Pan')).toBeTruthy();
  await fireEvent.press(screen.getByText('Pan'));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/transaction-edit',
    params: { id: 'two' },
  });
});
it('account detail opens the existing reconciliation for that account', async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'cash' });
  await render(<AccountDetailScreen />);
  await fireEvent.press(screen.getByText('Conciliar con el saldo real →'));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/accounts',
    params: { reconcile: 'cash' },
  });
  expect(ledgerRepository.page).toHaveBeenCalledWith({ accountId: 'cash' });
});
it('archived account keeps history but does not offer reconciliation', async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'old' });
  await render(<AccountDetailScreen />);
  expect(screen.queryByText('Conciliar con el saldo real →')).toBeNull();
  await fireEvent.press(screen.getByText('Ver historial completo de esta cuenta →'));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/(tabs)/movements',
    params: { account: 'old' },
  });
});
