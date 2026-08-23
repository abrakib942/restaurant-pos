import Link from "next/link";
import type { SessionPayload } from "@/lib/session";
import { RESTAURANT_NAME } from "@/lib/constants";
import { LogoutButton } from "@/components/logout-button";
import { WaiterNotifications } from "@/components/waiter/waiter-notifications";
import { ServiceRequestsBell } from "@/components/waiter/service-requests-bell";
import { SkipLink } from "@/components/ui/skip-link";
import { Badge } from "@/components/ui/badge";

type WaiterShellProps = {
  user: SessionPayload;
  children: React.ReactNode;
};

export function WaiterShell({ user, children }: WaiterShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SkipLink />
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/waiter"
              className="font-heading text-2xl tracking-tight text-primary"
            >
              {RESTAURANT_NAME}
            </Link>
            <Badge variant="secondary" className="rounded-md font-normal">
              Floor
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <ServiceRequestsBell />
            <WaiterNotifications />
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.name}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main id="main-content" className="flex-1 p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}
