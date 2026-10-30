import { fireEvent, render, screen } from '@testing-library/react-native';
import { FlowChart } from '../flow-chart';
it('exposes signed daily values as readable text as well as the chart', async () => {
  await render(
    <FlowChart
      cumulative
      data={[
        {
          label: '1/10',
          incomeCents: 0,
          expenseCents: 9000,
          netCents: -9000,
          cumulativeCents: -9000,
        },
        {
          label: '2/10',
          incomeCents: 10000,
          expenseCents: 0,
          netCents: 10000,
          cumulativeCents: 1000,
        },
      ]}
    />,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Ver valores diarios' }));
  expect(screen.getByText(/1\/10 · Entradas/)).toBeTruthy();
  expect(screen.getByText(/2\/10 · Entradas/)).toBeTruthy();
  expect(screen.queryByText(/NaN/)).toBeNull();
});
