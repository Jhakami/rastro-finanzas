import { fireEvent, render, screen } from '@testing-library/react-native';
import AnalysisScreen from '../../../app/analysis';
import DashboardScreen from '../../../app/(tabs)/index';
import { useFinance } from '../finance-provider';
import { useLocalSearchParams } from 'expo-router';
jest.mock('../use-analysis-report', () => ({
  useAnalysisReport: (period: 'month' | '7d' | '30d') => {
    const { buildAnalysisView } = jest.requireActual('@/application/analysis-view-model');
    const model = buildAnalysisView([], period, null, [], []);
    return {
      data: { ...model, incomeCount: 0, expenseCount: 0, microCount: 0, microExpenseCents: 0 },
      loading: false,
      error: null,
    };
  },
}));
jest.mock('../finance-provider', () => ({ useFinance: jest.fn() }));
jest.mock('../budget-summary', () => ({ BudgetSummary: () => null }));
jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    router: { back: jest.fn(), push: jest.fn() },
    useLocalSearchParams: jest.fn(() => ({})),
    Link: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
      asChild ? children : <Text>{children}</Text>,
  };
});
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
const base = {
  transactions: [],
  allAccounts: [{ id: 'cash', name: 'Efectivo', isArchived: false }],
  allCategories: [],
  allTags: [],
  balances: { cash: 12345 },
  microThresholdCents: 500,
  insights: [],
  loading: false,
  error: null,
};
beforeEach(() => {
  jest.mocked(useFinance).mockReturnValue(base as never);
  jest.mocked(useLocalSearchParams).mockReturnValue({});
});
it('defaults to month, distinguishes current balance and avoids charts for empty periods', async () => {
  await render(<AnalysisScreen />);
  expect(screen.getByText('Este mes')).toBeTruthy();
  expect(screen.getByText('Saldo actual')).toBeTruthy();
  expect(screen.getByText('Sin flujo registrado')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Gastos' }));
  expect(screen.getByText('Sin gastos', { exact: true })).toBeTruthy();
});
it('uses the same account and calendar period in reports', async () => {
  await render(<AnalysisScreen />);
  await fireEvent.press(screen.getByText('7 días'));
  await fireEvent.press(screen.getByText('Efectivo', { exact: true }));
  await fireEvent.press(screen.getByText('Informes'));
  expect(screen.getByText('0 entradas · 0 gastos · 7 días calendario')).toBeTruthy();
  expect(screen.queryByText(/NaN/)).toBeNull();
});
it('unknown deep-link accounts fall back to all accounts rather than a false zero balance', async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ account: 'missing' });
  await render(<AnalysisScreen />);
  expect(screen.getByText(/Saldo registrado de todas las cuentas/)).toBeTruthy();
});
it('recupera gráficos del Resumen anterior y conserva Análisis separado', async () => {
  await render(<DashboardScreen />);
  expect(screen.getByText('+ Registrar gasto')).toBeTruthy();
  expect(screen.getByText('Resumen del mes')).toBeTruthy();
  expect(screen.getByText('Análisis · Explorar flujo, gastos e informes →')).toBeTruthy();
  expect(screen.getByText('Monto según hora de compra')).toBeTruthy();
  expect(screen.getByText('En qué se fue el dinero')).toBeTruthy();
  await fireEvent.press(screen.getByText('14 días'));
  expect(screen.getByText('Evolución del gasto diario')).toBeTruthy();
});
