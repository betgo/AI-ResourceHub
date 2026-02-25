import type { Metadata } from "next";
import Link from "next/link";

import { AuthNav } from "@/components/auth/auth-nav";
import { ToastProvider } from "@/components/feedback/toast-provider";
import { Container } from "@/components/layout/container";
import { cn } from "@/lib/utils";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ResourceHub",
    template: "%s | ResourceHub",
  },
  description: "Discover and publish high-quality digital resources.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn("min-h-screen text-slate-900")}>
        <ToastProvider>
          <div className="relative flex min-h-screen flex-col">
            <header className="border-b border-[var(--stroke-soft)] bg-white/80 backdrop-blur">
              <Container className="flex h-16 items-center justify-between gap-4">
                <Link href="/" className="space-y-0.5">
                  <div className="text-sm font-semibold tracking-wide text-slate-800">
                    ResourceHub
                  </div>
                  <p className="hidden text-xs text-[var(--text-muted)] sm:block">
                    Share. Discover. Build.
                  </p>
                </Link>
                <AuthNav />
              </Container>
            </header>
            <main className="flex-1">{children}</main>
            <footer className="border-t border-[var(--stroke-soft)] py-4 text-center text-xs text-[var(--text-muted)]">
              <Container>Built with Next.js + Supabase.</Container>
            </footer>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
