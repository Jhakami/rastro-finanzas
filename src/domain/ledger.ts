import type { FinanceTransaction, TransactionKind } from './types';

export interface TransactionCursor {
  occurredAt: string;
  id: string;
}
export interface TransactionQuery {
  text?: string;
  accountId?: string;
  kind?: TransactionKind;
  categoryId?: string;
  /** Every selected tag must be present. */
  tagIds?: string[];
  from?: string;
  until?: string;
  cursor?: TransactionCursor;
}
export interface TransactionPage {
  items: FinanceTransaction[];
  nextCursor: TransactionCursor | null;
}
export interface LedgerRepository {
  page(query: TransactionQuery): Promise<TransactionPage>;
}

/** Local dates from the form; end date includes its whole local calendar day. */
export function ledgerDateRange(from: string, through: string) {
  function parse(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Usa fechas AAAA-MM-DD.');
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(5, 7));
    const day = Number(value.slice(8, 10));
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day)
      throw new Error('La fecha no existe.');
    return date;
  }
  const start = from ? parse(from) : undefined;
  const end = through ? parse(through) : undefined;
  if (start && end && start > end) throw new Error('Desde no puede ser posterior a Hasta.');
  end?.setDate(end.getDate() + 1);
  return { from: start?.toISOString(), until: end?.toISOString() };
}
