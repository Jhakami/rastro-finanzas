export type TransactionKind = 'income' | 'expense' | 'transfer' | 'refund' | 'adjustment';

export interface Account {
  id: string;
  name: string;
  color: string;
  initialBalanceCents: number;
  isDefault: boolean;
  isArchived: boolean;
  sortOrder: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  parentId?: string | null;
  isArchived?: boolean;
}

export interface LocationCell {
  id: string;
  centerLatitude: number;
  centerLongitude: number;
  label?: string | null;
}

export interface FinanceTransaction {
  id: string;
  kind: TransactionKind;
  amountCents: number;
  accountId: string;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  occurredAt: string;
  merchant?: string | null;
  note?: string | null;
  source?: string | null;
  locationCellId?: string | null;
  location?: LocationCell | null;
  microOverride?: boolean | null;
  refundOfId?: string | null;
  deletedAt?: string | null;
}

export interface SpendingLimit {
  id: string;
  name: string;
  amountCents: number;
  categoryId?: string | null;
  accountId?: string | null;
  warningPercent: number;
  enabled: boolean;
}

export interface FavoriteTemplate {
  id: string;
  name: string;
  amountCents?: number | null;
  accountId: string;
  categoryId: string;
  merchant?: string | null;
  note?: string | null;
  usageCount: number;
}

export interface Insight {
  id: string;
  title: string;
  summary: string;
  evidence: string;
  sampleSize: number;
  confidence: 'insufficient' | 'emerging' | 'strong';
  relatedTransactionIds: string[];
}

export interface DashboardMetrics {
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  microExpenseCents: number;
  microCount: number;
  projectedExpenseCents: number;
  topCategoryId: string | null;
  busiestHour: number | null;
  busiestWeekday: number | null;
}
