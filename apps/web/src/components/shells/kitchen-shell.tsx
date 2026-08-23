import Link from "next/link";
import type { SessionPayload } from "@/lib/role-path";
import { RESTAURANT_NAME } from "@/lib/constants";
import { LogoutButton } from "@/components/logout-button";
import { SkipLink } from "@/components/ui/skip-link";
import { Badge } from "@/components/ui/badge";

type KitchenShellProps = {
  user: SessionPayload;
  children: React.ReactNode;
};

export function KitchenShell({ user, children }: KitchenShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SkipLink />
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <Link
              href="/kitchen"
              className="font-heading text-2xl tracking-tight text-primary"
            >
              {RESTAURANT_NAME}
            </Link>
            <Badge className="rounded-md font-normal">Pass</Badge>
          </div>
          <div className="flex items-center gap-3">
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
