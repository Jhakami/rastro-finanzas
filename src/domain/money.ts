export function formatPEN(cents: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function parseAmountToCents(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

export function signedEffect(kind: string, amountCents: number): number {
  if (kind === 'expense') return -Math.abs(amountCents);
  if (kind === 'income' || kind === 'refund') return Math.abs(amountCents);
  if (kind === 'adjustment') return amountCents;
  return 0;
}
