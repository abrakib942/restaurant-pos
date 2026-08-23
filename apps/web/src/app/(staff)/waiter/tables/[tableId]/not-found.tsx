import Link from "next/link";
import { RESTAURANT_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export default function WaiterTableNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <p className="font-heading text-3xl text-primary">{RESTAURANT_NAME}</p>
      <h1 className="font-heading text-2xl">Table not found</h1>
      <Button asChild variant="outline">
        <Link href="/waiter">Back to floor</Link>
      </Button>
    </div>
  );
}
