import Link from "next/link";
import { RESTAURANT_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export default function MenuNotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-heading text-4xl text-primary">{RESTAURANT_NAME}</p>
      <h1 className="font-heading text-2xl">Table not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This QR code isn&apos;t linked to a table. Ask your server for help.
      </p>
      <Button asChild variant="outline">
        <Link href="/">Back</Link>
      </Button>
    </div>
  );
}
