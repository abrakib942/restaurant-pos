import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-dvh flex-1 items-center justify-center px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.28_0.04_145),transparent_55%),radial-gradient(ellipse_at_bottom_right,oklch(0.32_0.06_82_/0.25),transparent_40%)]"
      />
      <div className="relative z-10 w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}
