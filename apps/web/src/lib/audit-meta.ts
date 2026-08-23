export type AuditLogRow = {
  id: string;
  action: string;
  actorName: string | null;
  target: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
};

export function formatAuditAction(action: string): string {
  return action
    .split(".")
    .map((part) => part.replaceAll("_", " "))
    .join(" · ");
}
