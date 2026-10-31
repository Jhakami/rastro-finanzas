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

export interface AuditRepository {
  page(cursor?: AuditCursor | null): Promise<AuditPage>;
  /** Returns false if already active; never duplicates a movement or restoration event. */
  restoreTransaction(id: string, reason: string): Promise<boolean>;
}
