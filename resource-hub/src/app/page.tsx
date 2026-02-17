import Link from "next/link";

import { Container } from "@/components/layout/container";

const quickActions = [
  {
    title: "Browse Resources",
    description: "Explore curated templates, datasets, and dev assets.",
    href: "/resources",
  },
  {
    title: "Publish Resource",
    description: "Upload your file, add metadata, and submit for review.",
    href: "/submit",
  },
  {
    title: "Open Dashboard",
    description: "Track your uploads, favorites, and download history.",
    href: "/dashboard",
  },
];

export default function Home() {
  return (
    <main className="py-16 sm:py-20">
      <Container className="space-y-8">
        <section className="rounded-3xl border border-[var(--stroke-soft)] bg-[var(--surface-elevated)] p-8 shadow-sm sm:p-12">
          <span className="inline-flex rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand)]">
            Resource Sharing Platform
          </span>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Build a focused hub for sharing useful digital resources.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-muted)] sm:text-lg">
            This baseline UI is ready for upcoming tasks: authentication,
            upload workflows, moderation, search, and social interactions.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/resources"
              className="rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Start Exploring
            </Link>
            <Link
              href="/submit"
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400"
            >
              Share a Resource
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {quickActions.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="rounded-2xl border border-[var(--stroke-soft)] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
            >
              <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                {item.description}
              </p>
            </Link>
          ))}
        </section>
      </Container>
    </main>
  );
}
