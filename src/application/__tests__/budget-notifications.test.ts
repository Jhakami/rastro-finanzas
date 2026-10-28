import * as Notifications from 'expo-notifications';
import { notifyBudgets, requestBudgetNotifications } from '../budget-notifications';
import { planningRepository } from '@/infrastructure/budget-repository';
import { budgetProgress, type Budget } from '@/domain/budgets';
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  AndroidImportance: { DEFAULT: 3 },
}));
jest.mock('@/infrastructure/budget-repository', () => ({
  planningRepository: { claimAlert: jest.fn(), releaseAlert: jest.fn() },
}));
const budget: Budget = {
  id: 'b',
  name: 'Personal',
  amountCents: 10000,
  warningPercent: 80,
  period: 'monthly',
  enabled: true,
  notify: true,
  sortOrder: 0,
  scope: { accountIds: [], categoryIds: [], tagIds: [] },
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: true } as never);
  jest.mocked(planningRepository.claimAlert).mockResolvedValue(true);
});
it('denied permissions never block a save or claim an alert', async () => {
  jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({ granted: false } as never);
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: false } as never);
  expect(await requestBudgetNotifications()).toBe(false);
  await expect(notifyBudgets([budgetProgress(budget, 9000, 1)])).resolves.toBeUndefined();
  expect(planningRepository.claimAlert).not.toHaveBeenCalled();
});
it('does not send already claimed alerts and never asks permissions automatically', async () => {
  jest.mocked(planningRepository.claimAlert).mockResolvedValue(false);
  await notifyBudgets([budgetProgress(budget, 9000, 1)]);
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
});
it('uses separate stages and period keys and hides financial details', async () => {
  const p = budgetProgress(budget, 12000, 2, new Date(2026, 9, 28));
  await notifyBudgets([p]);
  expect(planningRepository.claimAlert).toHaveBeenCalledWith('b', p.start, 'exceeded');
  const request = jest.mocked(Notifications.scheduleNotificationAsync).mock.calls[0]![0];
  expect(JSON.stringify(request.content)).not.toContain('Personal');
  expect(JSON.stringify(request.content)).not.toContain('120');
});
it('releases a failed delivery for retry without throwing', async () => {
  jest
    .mocked(Notifications.scheduleNotificationAsync)
    .mockRejectedValueOnce(new Error('OS unavailable'));
  const p = budgetProgress(budget, 8500, 1);
  await notifyBudgets([p]);
  expect(planningRepository.releaseAlert).toHaveBeenCalledWith('b', p.start, 'warning');
});
