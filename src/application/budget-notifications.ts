import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { BudgetProgress } from '@/domain/budgets';
import { planningRepository } from '@/infrastructure/budget-repository';

const CHANNEL = 'rastro-budgets';
async function channel() {
  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Presupuestos',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
}

export async function requestBudgetNotifications(): Promise<boolean> {
  try {
    await channel();
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}
export async function notifyBudgets(progress: BudgetProgress[]): Promise<void> {
  const candidates = progress.filter((p) => p.budget.notify && p.status !== 'normal');
  if (!candidates.length) return;
  try {
    if (!(await Notifications.getPermissionsAsync()).granted) return;
    await channel();
    for (const p of candidates) {
      // One notification for the threshold and one for exhaustion in each calendar period.
      if (!(await planningRepository.claimAlert(p.budget.id, p.start, p.status))) continue;
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: `budget:${p.budget.id}:${p.start}:${p.status}`,
          content: {
            title: 'Revisa tus presupuestos',
            body:
              p.status === 'exceeded'
                ? 'Un presupuesto alcanzó su límite. Consulta el detalle en Rastro.'
                : 'Un presupuesto alcanzó el umbral de aviso. Consulta el detalle en Rastro.',
          },
          trigger: { channelId: CHANNEL },
        });
      } catch {
        await planningRepository.releaseAlert(p.budget.id, p.start, p.status);
      }
    }
  } catch {
    /* Notifications must never turn a successful financial write into a failed save. */
  }
}
