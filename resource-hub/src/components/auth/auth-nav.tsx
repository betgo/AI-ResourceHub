import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import { LogoutButton } from "./logout-button";

const primaryNavItems = [
  { href: "/", label: "Home" },
  { href: "/resources", label: "Browse" },
  { href: "/submit", label: "Publish" },
];

export async function AuthNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <div className="hidden items-center gap-3 md:flex">
        <nav className="mr-2 flex items-center gap-1">
          {primaryNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--brand-soft)] hover:text-[var(--brand-strong)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {user ? (
          <>
            <Link
              href="/dashboard"
              className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-[var(--text-inverse)] shadow-[var(--shadow-soft)] transition hover:bg-[var(--brand-strong)]"
            >
              Dashboard
            </Link>
            <LogoutButton />
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-full border border-[var(--stroke-strong)] bg-[var(--surface-card)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--brand)] hover:text-[var(--brand-strong)]"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-[var(--text-inverse)] shadow-[var(--shadow-soft)] transition hover:bg-[var(--brand-strong)]"
            >
              Create account
            </Link>
          </>
        )}
      </div>

      <details className="group relative md:hidden">
        <summary className="flex list-none h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-[var(--stroke-soft)] bg-[var(--surface-card)] text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)] [&::-webkit-details-marker]:hidden">
          <span className="sr-only">Toggle navigation menu</span>
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M4 7h16" />
            <path d="M4 12h16" />
            <path d="M4 17h16" />
          </svg>
        </summary>
        <div className="absolute right-0 top-12 z-20 w-72 rounded-2xl border border-[var(--stroke-soft)] bg-[var(--surface-card)] p-4 shadow-[var(--shadow-strong)]">
          <nav className="flex flex-col gap-1">
            {primaryNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--brand-soft)] hover:text-[var(--brand-strong)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="my-3 h-px bg-[var(--stroke-soft)]" />

          {user ? (
            <div className="flex flex-col gap-2">
              <Link
                href="/dashboard"
                className="rounded-full bg-[var(--brand)] px-4 py-2 text-center text-sm font-semibold text-[var(--text-inverse)] shadow-[var(--shadow-soft)] transition hover:bg-[var(--brand-strong)]"
              >
                Dashboard
              </Link>
              <LogoutButton className="w-full justify-center" />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                href="/login"
                className="rounded-full border border-[var(--stroke-strong)] bg-[var(--surface-card)] px-4 py-2 text-center text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--brand)] hover:text-[var(--brand-strong)]"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-[var(--brand)] px-4 py-2 text-center text-sm font-semibold text-[var(--text-inverse)] shadow-[var(--shadow-soft)] transition hover:bg-[var(--brand-strong)]"
              >
                Create account
              </Link>
            </div>
          )}
        </div>
      </details>
    </>
  );
}
