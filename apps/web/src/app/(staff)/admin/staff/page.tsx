import { StaffManager } from "@/components/admin/staff-manager";
import { serverApiData } from "@/lib/server-api";

type StaffRow = {
  id: string;
  name: string;
  username: string;
  role: "WAITER" | "KITCHEN";
};

export default async function AdminStaffPage() {
  const staff = (await serverApiData<StaffRow[]>("/admin/staff")) ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl tracking-tight">Staff</h1>
        <p className="mt-2 text-muted-foreground">
          Waiter and kitchen accounts for the floor and pass.
        </p>
      </div>
      <StaffManager staff={staff} />
    </div>
  );
}
