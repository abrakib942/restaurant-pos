import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RESTAURANT_NAME } from "@/lib/constants";

export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <Image
        src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=2400&q=80"
        alt="The dining room at Brasa"
        fill
        priority
        className="object-cover origin-center animate-[hero-zoom_18s_ease-out_forwards]"
      />
      <div className="absolute inset-0 bg-linear-to-t from-background via-background/55 to-background/20" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[-20%] opacity-[0.12] animate-[grain_8s_steps(6)_infinite] bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20200%20200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22n%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.85%22%20numOctaves%3D%224%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23n)%22%2F%3E%3C%2Fsvg%3E')]"
      />

      <main className="relative z-10 flex min-h-dvh flex-col justify-end px-6 pb-16 pt-24 sm:px-12 sm:pb-20 lg:px-20">
        <p className="font-heading text-[clamp(4.5rem,16vw,11rem)] leading-[0.85] tracking-tight text-foreground animate-[fade-up_0.9s_ease_both]">
          {RESTAURANT_NAME}
        </p>
        <p className="mt-6 max-w-md font-heading text-xl text-foreground/90 animate-[fade-up_0.9s_0.2s_ease_both] sm:text-2xl">
          Wood-fired kitchen, run as one.
        </p>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground animate-[fade-up_0.9s_0.35s_ease_both] sm:text-base">
          Floor, menu, and pass share a single source of truth.
        </p>
        <div className="mt-8 animate-[fade-up_0.9s_0.5s_ease_both]">
          <Button size="lg" className="h-12 rounded-md px-8 text-base" asChild>
            <Link href="/login">Staff entrance</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
