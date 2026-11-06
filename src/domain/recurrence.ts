export type RecurrenceFrequency = 'weekly' | 'monthly' | 'yearly';

/** Calendar dates, not instants. Always calculate from the original anchor, never a clipped date. */
export function occurrenceDate(
  anchor: string,
  frequency: RecurrenceFrequency,
  index: number,
): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(anchor) || !Number.isSafeInteger(index) || index < 0) {
    throw new Error('Fecha o índice de recurrencia inválido.');
  }
  const year = Number(anchor.slice(0, 4));
  const month = Number(anchor.slice(5, 7)) - 1;
  const day = Number(anchor.slice(8, 10));
  const original = new Date(Date.UTC(year, month, day));
  if (year < 1900 || year > 9999 || original.toISOString().slice(0, 10) !== anchor) {
    throw new Error('Fecha de recurrencia inválida.');
  }
  let next: Date;
  if (frequency === 'weekly') next = new Date(Date.UTC(year, month, day + index * 7));
  else if (frequency === 'monthly' || frequency === 'yearly') {
    const first = new Date(
      Date.UTC(
        year + (frequency === 'yearly' ? index : 0),
        month + (frequency === 'monthly' ? index : 0),
        1,
      ),
    );
    const lastDay = new Date(
      Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
    ).getUTCDate();
    next = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(day, lastDay)));
  } else throw new Error('Frecuencia inválida.');
  if (!Number.isFinite(next.getTime()) || next.getUTCFullYear() > 9999)
    throw new Error('Fecha fuera de rango.');
  return next.toISOString().slice(0, 10);
}
