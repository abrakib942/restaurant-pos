"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ApiClientError, apiMutate } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type StaffRow = {
  id: string;
  name: string;
  username: string;
  role: "WAITER" | "KITCHEN";
};

type StaffManagerProps = {
  staff: StaffRow[];
};

export function StaffManager({ staff }: StaffManagerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [role, setRole] = useState<"WAITER" | "KITCHEN">("WAITER");
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setRole("WAITER");
    setOpen(true);
  }

  function openEdit(member: StaffRow) {
    setEditing(member);
    setRole(member.role);
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {staff.length} staff account{staff.length === 1 ? "" : "s"}
        </p>
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setEditing(null);
          }}
        >
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="size-4" />
            Add staff
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit staff" : "New staff account"}
              </DialogTitle>
              <DialogDescription>
                Waiters and kitchen staff sign in with username + PIN.
              </DialogDescription>
            </DialogHeader>
            <form
              key={editing?.id ?? "new"}
              className="space-y-4"
              action={(formData) => {
                const payload = {
                  name: String(formData.get("name") ?? ""),
                  username: String(formData.get("username") ?? ""),
                  role,
                  ...(String(formData.get("pin") ?? "")
                    ? { pin: String(formData.get("pin")) }
                    : {}),
                };
                startTransition(async () => {
                  try {
                    if (editing) {
                      await apiMutate(
                        `/admin/staff/${editing.id}`,
                        "PATCH",
                        payload,
                      );
                    } else {
                      await apiMutate("/admin/staff", "POST", payload);
                    }
                    toast.success("Saved");
                    setOpen(false);
                    router.refresh();
                  } catch (err) {
                    toast.error(
                      err instanceof ApiClientError
                        ? err.message
                        : "Request failed",
                    );
                  }
                });
              }}
            >
              {editing ? (
                <input type="hidden" name="id" value={editing.id} />
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={editing?.name ?? ""}
                  placeholder="Maya Chen"
                  disabled={pending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  required
                  defaultValue={editing?.username ?? ""}
                  placeholder="maya"
                  disabled={pending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={role}
                  onValueChange={(value) =>
                    setRole(value as "WAITER" | "KITCHEN")
                  }
                  disabled={pending}
                >
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WAITER">Waiter</SelectItem>
                    <SelectItem value="KITCHEN">Kitchen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin">
                  {editing ? "New PIN (optional)" : "PIN"}
                </Label>
                <Input
                  id="pin"
                  name="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  required={!editing}
                  placeholder="••••"
                  disabled={pending}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving…" : editing ? "Save changes" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {staff.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
          <p className="font-heading text-xl">No staff yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Add waiters and kitchen users for the floor and pass.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    @{member.username}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="rounded-md capitalize"
                    >
                      {member.role.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => openEdit(member)}
                      >
                        <Pencil className="size-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button type="button" size="icon-sm" variant="ghost">
                            <Trash2 className="size-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete staff account?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This removes {member.name} (@{member.username}).
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                startTransition(async () => {
                                  try {
                                    await apiMutate(
                                      `/admin/staff/${member.id}`,
                                      "DELETE",
                                    );
                                    toast.success("Staff deleted");
                                    router.refresh();
                                  } catch (err) {
                                    toast.error(
                                      err instanceof ApiClientError
                                        ? err.message
                                        : "Request failed",
                                    );
                                  }
                                });
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
