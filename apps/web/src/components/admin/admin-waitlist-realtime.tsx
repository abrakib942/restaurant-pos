"use client";

import { QueryProvider } from "@/components/providers/query-provider";
import { RealtimeListener } from "@/components/providers/realtime-listener";

export function AdminWaitlistRealtime({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <RealtimeListener url="/api/sse/admin/waitlist" refresh>
        {children}
      </RealtimeListener>
    </QueryProvider>
  );
}
