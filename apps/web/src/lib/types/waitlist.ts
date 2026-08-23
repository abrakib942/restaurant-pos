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
