"use client";

import Link from "next/link";
import { useEffect } from "react";

import { AlertMessage } from "@/components/feedback/alert-message";
import { Container } from "@/components/layout/container";

type ErrorPageProps = {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
};

export default function GlobalErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="py-14 sm:py-20">
      <Container className="max-w-3xl space-y-6">
        <section className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Unexpected error
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Something went wrong
          </h1>
          <p className="text-sm leading-6 text-[var(--text-muted)] sm:text-base">
            The page failed to render. You can retry this action or return to the homepage.
          </p>
        </section>

        <AlertMessage
          variant="error"
          title="Runtime exception"
          message={error.message || "Unknown rendering error."}
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-[var(--brand)] px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400"
          >
            Go to homepage
          </Link>
        </div>
      </Container>
    </div>
  );
}
