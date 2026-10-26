import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import NewTransactionScreen from '../../../app/new';
import { useFinance } from '../finance-provider';
import { useFavoriteStore } from '../favorite-store';
import { Alert } from 'react-native';

jest.mock('../finance-provider', () => ({ useFinance: jest.fn() }));
jest.mock('../favorite-store', () => ({ useFavoriteStore: jest.fn() }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/application/location-service', () => ({
  captureApproximateLocation: jest.fn(),
  LocationCaptureError: Error,
}));

const manual = {
  id: 'manual',
  name: 'Agua diaria',
  accountId: 'account-yape',
  categoryId: 'water',
  amountMode: 'variable',
  amountCents: null,
  merchant: null,
  note: null,
  tagIds: [],
  isArchived: false,
  available: true,
};
let addTransaction: jest.Mock;
beforeEach(() => {
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  addTransaction = jest.fn().mockResolvedValue(undefined);
  jest.mocked(useFinance).mockReturnValue({
    accounts: [{ id: 'account-yape', name: 'Yape', isDefault: true }],
    categories: [
      { id: 'food', name: 'Alimentación', parentId: null },
      { id: 'water', name: 'Agua', parentId: 'food' },
    ],
    tags: [],
    favorites: [],
    transactions: [],
    addTransaction,
    addCategory: jest.fn(),
    deleteCategory: jest.fn(),
  } as never);
  jest
    .mocked(useFavoriteStore)
    .mockImplementation(
      (selector: unknown) =>
        (selector as (state: unknown) => unknown)({ items: [manual] }) as never,
    );
});
afterEach(() => jest.restoreAllMocks());

it('saves with amount and category without optional details', async () => {
  await render(<NewTransactionScreen />);
  expect(screen.queryByPlaceholderText('Algo que quieras recordar')).toBeNull();
  await fireEvent.changeText(screen.getByPlaceholderText('0.00'), '2.50');
  await fireEvent.press(screen.getByText('Agua'));
  await fireEvent.press(screen.getByText('Guardar gasto'));
  await waitFor(() =>
    expect(addTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: 250,
        accountId: 'account-yape',
        categoryId: 'water',
        note: null,
        merchant: null,
      }),
    ),
  );
});

it('applying a variable favorite clears stale details and never auto-saves', async () => {
  await render(<NewTransactionScreen />);
  await fireEvent.press(screen.getByText('Más detalles'));
  await fireEvent.changeText(
    screen.getByPlaceholderText('Algo que quieras recordar'),
    'Nota anterior',
  );
  await fireEvent.changeText(screen.getByPlaceholderText('0.00'), '9');
  await fireEvent.press(screen.getByText('Agua diaria'));
  expect(screen.getByPlaceholderText('0.00').props.value).toBe('');
  expect(screen.getByPlaceholderText('Algo que quieras recordar').props.value).toBe('');
  expect(addTransaction).not.toHaveBeenCalled();
});

it('blocks repeated save while the first write is pending', async () => {
  let finish!: () => void;
  addTransaction.mockReturnValue(
    new Promise<void>((resolve) => {
      finish = resolve;
    }),
  );
  await render(<NewTransactionScreen />);
  await fireEvent.changeText(screen.getByPlaceholderText('0.00'), '3');
  await fireEvent.press(screen.getByText('Agua'));
  const button = screen.getByText('Guardar gasto');
  await fireEvent.press(button);
  await fireEvent.press(button);
  await waitFor(() => expect(addTransaction).toHaveBeenCalledTimes(1));
  await act(async () => finish());
});

it('preserves the amount when a write fails', async () => {
  addTransaction.mockRejectedValue(new Error('Sin espacio'));
  await render(<NewTransactionScreen />);
  await fireEvent.changeText(screen.getByPlaceholderText('0.00'), '3');
  await fireEvent.press(screen.getByText('Agua'));
  await fireEvent.press(screen.getByText('Guardar gasto'));
  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith('No se pudo guardar', 'Sin espacio'),
  );
  expect(screen.getByPlaceholderText('0.00').props.value).toBe('3');
});
