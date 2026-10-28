import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import BudgetsScreen from '../../../app/budgets';
import { useFinance } from '../finance-provider';
import { useBudgetStore } from '../budget-store';
import { requestBudgetNotifications } from '@/application/budget-notifications';
import { BudgetOverlapError } from '@/domain/budgets';

jest.mock('../finance-provider', () => ({ useFinance: jest.fn() }));
jest.mock('../budget-store', () => ({ useBudgetStore: jest.fn() }));
jest.mock('@/application/budget-notifications', () => ({ requestBudgetNotifications: jest.fn() }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
let save: jest.Mock;
beforeEach(() => {
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  save = jest.fn().mockResolvedValue(undefined);
  jest
    .mocked(useFinance)
    .mockReturnValue({ allAccounts: [], allCategories: [], allTags: [] } as never);
  jest.mocked(useBudgetStore).mockReturnValue({
    items: [],
    progress: [],
    loading: false,
    error: null,
    refresh: jest.fn().mockResolvedValue(undefined),
    save,
    archive: jest.fn(),
    move: jest.fn(),
  });
});
afterEach(() => jest.restoreAllMocks());
async function fill() {
  await render(<BudgetsScreen />);
  await fireEvent.press(screen.getByText('Crear presupuesto'));
  await fireEvent.changeText(screen.getByLabelText('Nombre del presupuesto'), 'Mes tranquilo');
  await fireEvent.changeText(screen.getByLabelText('Monto del presupuesto'), '100');
}
it('denied notifications do not prevent saving the default monthly budget', async () => {
  jest.mocked(requestBudgetNotifications).mockResolvedValue(false);
  await fill();
  await fireEvent(screen.getByLabelText('Avisos en el teléfono'), 'valueChange', true);
  await fireEvent.press(screen.getByText('Guardar presupuesto'));
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'Mes tranquilo',
      amountCents: 10000,
      period: 'monthly',
      notify: false,
      scope: { accountIds: [], categoryIds: [], tagIds: [] },
    }),
    undefined,
    false,
  );
});
it('retains fields on overlap and only retries after explicit confirmation', async () => {
  save.mockRejectedValueOnce(new BudgetOverlapError(['General']));
  await fill();
  await fireEvent.press(screen.getByText('Guardar presupuesto'));
  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith(
      'Presupuestos que se solapan',
      expect.any(String),
      expect.any(Array),
    ),
  );
  expect(save).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Nombre del presupuesto').props.value).toBe('Mes tranquilo');
  const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)![2]!;
  await act(async () => buttons.find((b) => b.text === 'Guardar de todas formas')!.onPress!());
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(save.mock.calls[1]![2]).toBe(true);
});
it('retains the form after a failed write', async () => {
  save.mockRejectedValue(new Error('Sin espacio'));
  await fill();
  await fireEvent.press(screen.getByText('Guardar presupuesto'));
  await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('No se guardó', 'Sin espacio'));
  expect(screen.getByLabelText('Monto del presupuesto').props.value).toBe('100');
});
