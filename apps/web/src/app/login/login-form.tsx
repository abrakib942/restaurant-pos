"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RESTAURANT_NAME } from "@/lib/constants";
import { ApiClientError, apiMutate } from "@/lib/api-client";
import { roleHomePath } from "@/lib/role-path";
import type { Role } from "@/lib/role-path";

type LoginData = {
  redirectTo?: string;
  user: {
    userId?: string;
    id?: string;
    name: string;
    username: string;
    role: string;
  };
};

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const username = String(formData.get("username") ?? "").trim();
    const pin = String(formData.get("pin") ?? "");

    try {
      const body = await apiMutate<LoginData>("/auth/login", "POST", {
        username,
        pin,
      });

      const role = body.data?.user.role as Role | undefined;
      const redirectTo =
        body.data?.redirectTo ??
        (role ? roleHomePath(role) : "/login");

      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : "Sign in failed";
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-border/80 bg-card/90 shadow-none backdrop-blur-sm">
      <CardHeader className="space-y-3">
        <p className="font-heading text-3xl tracking-tight text-primary">
          {RESTAURANT_NAME}
        </p>
        <CardTitle className="text-xl font-medium">Staff entrance</CardTitle>
        <CardDescription id="login-description">
          Sign in with your username and 4-digit PIN.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} aria-describedby="login-description">
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              placeholder="maya"
              required
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pin">PIN</Label>
            <Input
              id="pin"
              name="pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              pattern="\d{4}"
              maxLength={4}
              placeholder="••••"
              required
              disabled={pending}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="h-11 w-full text-base"
            disabled={pending}
          >
            {pending ? "Signing in…" : "Enter"}
          </Button>
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            Demo: admin/1111 · maya/2222 · julian/3333 · kenji/4444
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
