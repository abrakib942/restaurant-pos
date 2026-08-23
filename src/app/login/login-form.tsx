"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { loginAction, type LoginState } from "@/app/actions/auth";
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

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <Card className="w-full max-w-md border-border/80 bg-card/90 shadow-none backdrop-blur-sm">
      <CardHeader className="space-y-3">
        <p className="font-heading text-3xl tracking-tight text-primary">
          {RESTAURANT_NAME}
        </p>
        <CardTitle className="text-xl font-medium">Staff entrance</CardTitle>
        <CardDescription>
          Sign in with your username and 4-digit PIN.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
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
          {state?.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
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
