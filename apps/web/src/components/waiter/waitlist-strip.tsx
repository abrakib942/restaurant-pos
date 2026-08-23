import Link from "next/link";
import type { WaitlistParty } from "@/lib/types/waitlist";
import { Badge } from "@/components/ui/badge";

type WaitlistStripProps = {
  parties: WaitlistParty[];
};

export function WaitlistStrip({ parties }: WaitlistStripProps) {
  if (parties.length === 0) return null;

  return (
    <section className="rounded-lg border border-border bg-card/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg tracking-tight">Door line</h2>
          <p className="text-xs text-muted-foreground">
            Next parties waiting — host seats from admin.
          </p>
        </div>
        <Badge variant="secondary" className="rounded-md tabular-nums">
          {parties.length} waiting
        </Badge>
      </div>
      <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {parties.map((party, index) => (
          <li
            key={party.id}
            className="min-w-[9rem] shrink-0 rounded-md border border-border bg-background/60 px-3 py-2"
          >
            <p className="text-xs text-muted-foreground">#{index + 1}</p>
            <p className="truncate font-medium">{party.partyName}</p>
            <p className="text-xs text-muted-foreground">
              {party.partySize} guest{party.partySize === 1 ? "" : "s"} ·{" "}
              {party.waitMinutes}m
            </p>
            {party.status === "NOTIFIED" ? (
              <Badge
                variant="default"
                className="mt-1.5 rounded-md text-[10px]"
              >
                Notified
              </Badge>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        <Link href="/admin/waitlist" className="text-primary hover:underline">
          Open waitlist
        </Link>{" "}
        (admin) to seat a party.
      </p>
    </section>
  );
}
