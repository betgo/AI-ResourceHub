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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  applicationName: "ResourceHub",
  openGraph: {
    type: "website",
    title: "ResourceHub",
    description: "Discover and publish high-quality digital resources.",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "ResourceHub",
    description: "Discover and publish high-quality digital resources.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn("min-h-screen text-[var(--text-primary)]")}>
        <ToastProvider>
          <div className="relative flex min-h-screen flex-col">
            <header className="sticky top-0 z-40 border-b border-[var(--stroke-soft)] bg-[color:color-mix(in_oklab,var(--surface-elevated)_88%,white_12%)]/92 shadow-[0_12px_26px_rgba(10,33,57,0.09)] backdrop-blur-md">
              <Container className="flex h-16 items-center justify-between gap-4">
                <Link href="/" className="space-y-0.5">
                  <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--brand)]">
                    ResourceHub
                  </div>
                  <p className="hidden text-xs text-[var(--text-muted)] sm:block">
                    Curated assets for product teams
                  </p>
                </Link>
                <AuthNav />
              </Container>
            </header>
            <main className="flex-1">{children}</main>
            <footer className="border-t border-[var(--stroke-soft)] bg-[color:color-mix(in_oklab,var(--surface-muted)_78%,white_22%)] py-5 text-center text-xs text-[var(--text-muted)]">
              <Container>Built with Next.js + Supabase.</Container>
            </footer>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
