"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleLogout = async () => {
    setIsPending(true);

    const supabase = createClient();
    await supabase.auth.signOut();

    router.push("/login");
    router.refresh();
    setIsPending(false);
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className={cn(
        "rounded-full border border-[var(--stroke-strong)] bg-[var(--surface-card)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--brand)] hover:text-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-70",
        className,
      )}
    >
      {isPending ? "Signing out..." : "Log out"}
    </button>
  );
}
