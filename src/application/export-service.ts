import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { Account, Category, FinanceTransaction } from '@/domain/types';

function csvCell(value: unknown): string {
  const string = value === null || value === undefined ? '' : String(value);
  return `"${string.replace(/"/g, '""')}"`;
}

export async function exportTransactionsCsv(
  transactions: FinanceTransaction[],
  accounts: Account[],
  categories: Category[],
  includeLocation: boolean,
): Promise<void> {
  const headers = [
    'id',
    'tipo',
    'monto_pen',
    'cuenta',
    'categoria',
    'fecha',
    'comercio',
    'nota',
    'origen',
  ];
  if (includeLocation) headers.push('zona', 'latitud_aproximada', 'longitud_aproximada');
  const rows = transactions.map((item) => {
    const values: unknown[] = [
      item.id,
      item.kind,
      (item.amountCents / 100).toFixed(2),
      accounts.find((account) => account.id === item.accountId)?.name ?? item.accountId,
      categories.find((category) => category.id === item.categoryId)?.name ?? '',
      item.occurredAt,
      item.merchant,
      item.note,
      item.source,
    ];
    if (includeLocation)
      values.push(
        item.location?.label ?? item.location?.id ?? '',
        item.location?.centerLatitude ?? '',
        item.location?.centerLongitude ?? '',
      );
    return values.map(csvCell).join(',');
  });
  const csv = `\uFEFF${headers.map(csvCell).join(',')}\n${rows.join('\n')}`;
  const uri = `${FileSystem.cacheDirectory}rastro-${new Date().toISOString().slice(0, 10)}.csv`;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Exportar movimientos' });
}
