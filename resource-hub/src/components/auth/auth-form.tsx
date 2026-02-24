"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "register";

type AuthFormProps = {
  mode: AuthMode;
  nextPath?: string | null;
};

const formCopy: Record<
  AuthMode,
  {
    title: string;
    description: string;
    submitLabel: string;
    switchLabel: string;
    switchHref: string;
    switchText: string;
  }
> = {
  login: {
    title: "Welcome back",
    description: "Log in to publish resources, manage favorites, and track downloads.",
    submitLabel: "Log in",
    switchLabel: "No account yet?",
    switchHref: "/register",
    switchText: "Create one",
  },
  register: {
    title: "Create your account",
    description:
      "Sign up with email and password to start contributing to ResourceHub.",
    submitLabel: "Create account",
    switchLabel: "Already registered?",
    switchHref: "/login",
    switchText: "Log in",
  },
};

function getSafeNextPath(nextPath: string | null | undefined) {
  if (!nextPath) {
    return "/dashboard";
  }

  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/dashboard";
  }

  return nextPath;
}

export function AuthForm({ mode, nextPath }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const copy = formCopy[mode];
  const safeNextPath = useMemo(() => getSafeNextPath(nextPath), [nextPath]);

  const authSwitchHref = useMemo(() => {
    const rawNext = nextPath;
    if (!rawNext || !rawNext.startsWith("/") || rawNext.startsWith("//")) {
      return copy.switchHref;
    }

    const query = new URLSearchParams({ next: rawNext }).toString();
    return query ? `${copy.switchHref}?${query}` : copy.switchHref;
  }, [copy.switchHref, nextPath]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        setIsSubmitting(false);
        return;
      }

      router.replace(safeNextPath);
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    if (data.session) {
      router.replace(safeNextPath);
      router.refresh();
      return;
    }

    setSuccessMessage(
      "Registration submitted. Check your email for a confirmation link before logging in.",
    );
    setIsSubmitting(false);
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-[var(--stroke-soft)] bg-[var(--surface-elevated)] p-7 shadow-sm sm:p-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {copy.title}
        </h1>
        <p className="text-sm leading-6 text-[var(--text-muted)]">
          {copy.description}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor={`${mode}-email`} className="text-sm font-medium text-slate-800">
            Email
          </label>
          <input
            id={`${mode}-email`}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={`${mode}-password`}
            className="text-sm font-medium text-slate-800"
          >
            Password
          </label>
          <input
            id={`${mode}-password`}
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
            placeholder="At least 8 characters"
          />
        </div>

        {(errorMessage ?? successMessage) && (
          <p
            className={cn(
              "rounded-xl px-3 py-2 text-sm",
              errorMessage
                ? "bg-red-100 text-red-700"
                : "bg-emerald-100 text-emerald-700",
            )}
          >
            {errorMessage ?? successMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-full bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Please wait..." : copy.submitLabel}
        </button>
      </form>

      <p className="mt-5 text-sm text-[var(--text-muted)]">
        {copy.switchLabel}{" "}
        <Link href={authSwitchHref} className="font-semibold text-[var(--brand)] hover:underline">
          {copy.switchText}
        </Link>
      </p>
    </div>
  );
}
