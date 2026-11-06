import type { AuditEntry } from '@/domain/audit';
import { formatPEN } from '@/domain/money';

const actions: Record<string, string> = {
  created: 'Creación',
  corrected: 'Corrección',
  updated: 'Edición',
  deleted: 'Eliminación',
  restored: 'Restauración',
  reconciled: 'Conciliación',
  archived: 'Archivado',
  reordered: 'Cambio de orden',
};
const entities: Record<string, string> = {
  transaction: 'Movimiento',
  account: 'Cuenta',
  category: 'Categoría',
  tag: 'Etiqueta',
  favorite: 'Favorito',
  budget: 'Presupuesto',
};
export const movementKinds: Record<string, string> = {
  expense: 'Gasto',
  income: 'Ingreso',
  transfer: 'Transferencia',
  adjustment: 'Conciliación',
  refund: 'Reembolso',
};
const fields: Record<string, string> = {
  kind: 'Tipo',
  accountId: 'Cuenta',
  destinationAccountId: 'Destino',
  categoryId: 'Categoría',
  merchant: 'Comercio',
  note: 'Nota',
  source: 'Origen',
};
export function describeAudit(entry: AuditEntry, names: Record<string, string> = {}) {
  const title = `${entities[entry.entityType] ?? entry.entityType} · ${actions[entry.action] ?? entry.action}`;
  let data: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(entry.payload ?? 'null');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
      data = parsed as Record<string, unknown>;
  } catch {
    /* Older events may not contain valid JSON. Never invent historical values. */
  }
  const details: string[] = [];
  if (typeof data.kind === 'string') details.push(`Tipo: ${movementKinds[data.kind] ?? data.kind}`);
  if (typeof data.accountName === 'string') details.push(`Cuenta: ${data.accountName}`);
  if (typeof data.reason === 'string') details.push(`Motivo: ${data.reason}`);
  for (const [key, label] of [
    ['beforeCents', 'Saldo anterior'],
    ['differenceCents', 'Diferencia'],
    ['afterCents', 'Saldo resultante'],
  ] as const) {
    if (typeof data[key] === 'number' && Number.isSafeInteger(data[key]))
      details.push(`${label}: ${formatPEN(data[key])}`);
  }
  for (const [key, label] of [
    ['before', 'Antes'],
    ['after', 'Después'],
  ] as const) {
    const snapshot = data[key];
    if (snapshot && typeof snapshot === 'object') {
      const s = snapshot as Record<string, unknown>;
      const values = [
        'kind',
        'accountId',
        'destinationAccountId',
        'categoryId',
        'merchant',
        'note',
        'source',
      ]
        .filter((field) => typeof s[field] === 'string')
        .map((field) => {
          const value = s[field] as string;
          return `${fields[field]}: ${field === 'kind' ? (movementKinds[value] ?? value) : field.endsWith('Id') ? (names[value] ?? value) : value}`;
        });
      if (typeof s.amountCents === 'number' && Number.isSafeInteger(s.amountCents))
        values.unshift(formatPEN(s.amountCents));
      if (values.length) details.push(`${label}: ${values.join(' · ')}`);
    }
  }
  if (!details.length) details.push('Este evento no conserva detalles adicionales.');
  return { title, details };
}
