import { prisma } from "@/lib/prisma";

export type WaitlistParty = {
  id: string;
  partyName: string;
  partySize: number;
  phone: string | null;
  status: "WAITING" | "NOTIFIED" | "SEATED" | "CANCELLED" | "NO_SHOW";
  quotedMinutes: number | null;
  seatedTableLabel: string | null;
  seatedAt: string | null;
  createdAt: string;
  waitMinutes: number;
};

function waitMinutes(createdAt: Date) {
  return Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 60_000));
}

function mapEntry(entry: {
  id: string;
  partyName: string;
  partySize: number;
  phone: string | null;
  status: WaitlistParty["status"];
  quotedMinutes: number | null;
  seatedAt: Date | null;
  createdAt: Date;
  seatedTable: { label: string } | null;
}): WaitlistParty {
  return {
    id: entry.id,
    partyName: entry.partyName,
    partySize: entry.partySize,
    phone: entry.phone,
    status: entry.status,
    quotedMinutes: entry.quotedMinutes,
    seatedTableLabel: entry.seatedTable?.label ?? null,
    seatedAt: entry.seatedAt?.toISOString() ?? null,
    createdAt: entry.createdAt.toISOString(),
    waitMinutes: waitMinutes(entry.createdAt),
  };
}

const entryInclude = {
  seatedTable: { select: { label: true } },
} as const;

/** Active door line: waiting or notified, oldest first. */
export async function getActiveWaitlist(limit?: number) {
  const entries = await prisma.waitlistEntry.findMany({
    where: { status: { in: ["WAITING", "NOTIFIED"] } },
    orderBy: [{ createdAt: "asc" }],
    take: limit,
    include: entryInclude,
  });
  return entries.map(mapEntry);
}

/** Full list for admin (active first, then recent history). */
export async function getWaitlistForAdmin() {
  const entries = await prisma.waitlistEntry.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 50,
    include: entryInclude,
  });

  const active = entries
    .filter((e) => e.status === "WAITING" || e.status === "NOTIFIED")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map(mapEntry);

  const history = entries
    .filter((e) => !["WAITING", "NOTIFIED"].includes(e.status))
    .map(mapEntry);

  return { active, history };
}

export async function getAvailableTablesForSeating() {
  return prisma.table.findMany({
    where: { status: "AVAILABLE" },
    orderBy: { label: "asc" },
    select: { id: true, label: true },
  });
}
