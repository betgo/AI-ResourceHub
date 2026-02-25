import Link from "next/link";

import { Container } from "@/components/layout/container";

export default function NotFoundPage() {
  return (
    <div className="py-14 sm:py-20">
      <Container className="max-w-3xl space-y-6 text-center">
        <section className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-[var(--text-muted)]">
            404 Not Found
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            We can&apos;t find that page
          </h1>
          <p className="text-sm leading-6 text-[var(--text-muted)] sm:text-base">
            The requested content may have been removed, renamed, or is temporarily unavailable.
          </p>
        </section>

        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/resources"
            className="rounded-full bg-[var(--brand)] px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Browse resources
          </Link>
          <Link
            href="/"
            className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400"
          >
            Back home
          </Link>
        </div>
      </Container>
    </div>
  );
}
