import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { RESTAURANT_NAME } from "@/lib/constants";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: RESTAURANT_NAME,
  description: "Wood-fired kitchen. One floor, one menu, one pass.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${outfit.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster richColors closeButton position="top-center" />
      </body>
    </html>
  );
}
