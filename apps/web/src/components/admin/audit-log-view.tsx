"use client";

import { formatAuditAction, type AuditLogRow } from "@/lib/audit-meta";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AuditLogViewProps = {
  entries: AuditLogRow[];
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatMeta(meta: Record<string, unknown> | null) {
  if (!meta || Object.keys(meta).length === 0) return "—";
  return Object.entries(meta)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" · ");
}

export function AuditLogView({ entries }: AuditLogViewProps) {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="font-heading text-3xl tracking-tight sm:text-4xl">
          Audit log
        </h1>
        <p className="mt-2 text-muted-foreground">
          Recent staff actions — sign-ins, seating, billing, and voids.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest events</CardTitle>
          <CardDescription>Most recent {entries.length} entries</CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatWhen(entry.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatAuditAction(entry.action)}
                      </TableCell>
                      <TableCell>{entry.actorName ?? "—"}</TableCell>
                      <TableCell>{entry.target ?? "—"}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {formatMeta(entry.meta)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
