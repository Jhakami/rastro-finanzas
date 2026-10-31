import { decodeReport, reportParameters, reportingRepository } from '../reporting-repository';
import { openDatabase } from '../database';
jest.mock('../database', () => ({ openDatabase: jest.fn() }));
it('builds exact local days, including leap day, with exclusive end', () => {
  const params = reportParameters('month', null, 500, new Date(2024, 1, 29, 12));
  const days = JSON.parse(params.$days);
  expect(days).toHaveLength(29);
  expect(new Date(params.$until).getDate()).toBe(1);
  expect(days[28].label).toBe('29/2');
  expect(JSON.parse(reportParameters('7d', 'cash', 100).$days)).toHaveLength(7);
});
it('decodes bounded samples separately from totals and computes cumulative flow', () => {
  const row = {
    incomeCents: 1000,
    expenseCents: 500,
    incomeCount: 100,
    expenseCount: 1000,
    microExpenseCents: 10,
    microCount: 1,
    dailyJson: JSON.stringify([
      { label: '1/1', incomeCents: 1000, expenseCents: 200 },
      { label: '2/1', incomeCents: 0, expenseCents: 300 },
    ]),
    categoriesJson: '[]',
    tagsJson: '[]',
    recentJson: '[]',
    topJson: '[]',
    scatterJson: '[]',
  };
  const model = decodeReport(row, 'month', [], [], new Date(2026, 0, 2));
  expect(model.daily.map((d) => d.cumulativeCents)).toEqual([800, 500]);
  expect(model.expenseCount).toBe(1000);
  expect(model.expenses).toHaveLength(0);
  expect(model.dailyExpenseAverageCents).toBe(250);
  expect(model.projectedExpenseCents).toBe(7750);
});
it('fetches one aggregate row, never a list of transactions', async () => {
  const getFirstAsync = jest.fn().mockResolvedValue(null);
  const getAllAsync = jest.fn();
  jest.mocked(openDatabase).mockResolvedValue({ getFirstAsync, getAllAsync } as never);
  await expect(reportingRepository.report('month', null, 500, [], [])).rejects.toThrow();
  expect(getFirstAsync).toHaveBeenCalledTimes(1);
  expect(getAllAsync).not.toHaveBeenCalled();
});
