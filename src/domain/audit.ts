export interface AuditCursor {
  occurredAt: string;
  id: string;
}

export interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  payload: string | null;
  occurredAt: string;
}

export interface AuditPage {
  items: AuditEntry[];
  nextCursor: AuditCursor | null;
}

export interface DeletedMovement {
  id: string;
  kind: string;
  amountCents: number;
  accountName: string;
  accountArchived: number;
  destinationName: string | null;
  categoryName: string | null;
  categoryArchived: number | null;
  occurredAt: string;
  deletedAt: string;
}

export interface AuditRepository {
  deletedPage(
    cursor?: AuditCursor | null,
  ): Promise<{ items: DeletedMovement[]; nextCursor: AuditCursor | null }>;
  page(cursor?: AuditCursor | null): Promise<AuditPage>;
  /** Returns false if already active; never duplicates a movement or restoration event. */
  restoreTransaction(id: string, reason: string): Promise<boolean>;
}
