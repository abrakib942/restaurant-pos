import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { LogoutButton } from "@/components/logout-button";
import { AdminNav } from "@/components/admin/admin-nav";
import { SkipLink } from "@/components/ui/skip-link";
import { RESTAURANT_NAME } from "@/lib/constants";
import type { SessionPayload } from "@/lib/session";

type AdminShellProps = {
  user: SessionPayload;
  children: React.ReactNode;
};

export function AdminShell({ user, children }: AdminShellProps) {
  return (
    <div className="flex min-h-dvh bg-background">
      <SkipLink />
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <div className="px-5 py-6">
          <p className="font-heading text-2xl tracking-tight text-primary">
            {RESTAURANT_NAME}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Admin
          </p>
        </div>
        <AdminNav />
        <div className="space-y-3 p-4">
          <Separator />
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                @{user.username}
              </p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <div>
            <p className="font-heading text-lg text-primary">
              {RESTAURANT_NAME}
            </p>
            <p className="text-xs text-muted-foreground">{user.name}</p>
          </div>
          <LogoutButton />
        </header>
        <div className="border-b border-border px-4 py-2 md:hidden">
          <div className="flex gap-2 overflow-x-auto text-sm">
            <Link
              href="/admin"
              className="whitespace-nowrap text-muted-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/waitlist"
              className="whitespace-nowrap text-muted-foreground"
            >
              Waitlist
            </Link>
            <Link
              href="/admin/categories"
              className="whitespace-nowrap text-muted-foreground"
            >
              Categories
            </Link>
            <Link
              href="/admin/tables"
              className="whitespace-nowrap text-muted-foreground"
            >
              Tables
            </Link>
            <Link
              href="/admin/staff"
              className="whitespace-nowrap text-muted-foreground"
            >
              Staff
            </Link>
            <Link
              href="/admin/menu"
              className="whitespace-nowrap text-muted-foreground"
            >
              Menu
            </Link>
            <Link
              href="/admin/reports"
              className="whitespace-nowrap text-muted-foreground"
            >
              Reports
            </Link>
            <Link
              href="/admin/audit"
              className="whitespace-nowrap text-muted-foreground"
            >
              Audit
            </Link>
          </div>
        </div>
        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
