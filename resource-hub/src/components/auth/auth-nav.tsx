import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import { LogoutButton } from "./logout-button";

export async function AuthNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <nav className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400"
        >
          Log in
        </Link>
        <Link
          href="/register"
          className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Create account
        </Link>
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-2">
      <Link
        href="/submit"
        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400"
      >
        Publish
      </Link>
      <Link
        href="/dashboard"
        className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
      >
        Dashboard
      </Link>
      <LogoutButton />
    </nav>
  );
}
