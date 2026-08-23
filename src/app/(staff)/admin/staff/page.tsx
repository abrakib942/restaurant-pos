import { StaffManager } from "@/components/admin/staff-manager";
import { prisma } from "@/lib/prisma";

export default async function AdminStaffPage() {
  const staff = await prisma.user.findMany({
    where: { role: { in: ["WAITER", "KITCHEN"] } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl tracking-tight">Staff</h1>
        <p className="mt-2 text-muted-foreground">
          Waiter and kitchen accounts for the floor and pass.
        </p>
      </div>
      <StaffManager
        staff={staff.map((user) => ({
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role as "WAITER" | "KITCHEN",
        }))}
      />
    </div>
  );
}
