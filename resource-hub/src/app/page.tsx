import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { listCategories } from "@/lib/db/categories";
import { listResources } from "@/lib/db/resources";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Home",
  description:
    "Discover practical templates, datasets, and toolkits on ResourceHub.",
  alternates: {
    canonical: "/",
  },
};

const fallbackCategories = [
  { id: "design", name: "Design Assets", slug: "design-assets" },
  { id: "frontend", name: "Frontend Kits", slug: "frontend-kits" },
  { id: "backend", name: "Backend Templates", slug: "backend-templates" },
  { id: "ai", name: "AI Resources", slug: "ai-resources" },
];

const valuePillars = [
  {
    title: "Searchable Library",
    description:
      "Structured metadata, categories, and tags keep resources easy to discover.",
  },
  {
    title: "Quality Workflow",
    description:
      "Every submission goes through review, so teams can trust what they download.",
  },
  {
    title: "Builder Friendly",
    description:
      "Ship-ready kits, datasets, and templates that reduce setup time for real work.",
  },
];

const publishFlow = [
  "Upload your file and add clear metadata.",
  "Admins review and moderate submissions.",
  "Community discovers, favorites, and downloads.",
];

function summarizeText(input: string, maxLength: number) {
  if (input.length <= maxLength) {
    return input;
  }

  return `${input.slice(0, maxLength).trimEnd()}...`;
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return "Recently added";
  }

  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return "Recently added";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

function formatCompactNumber(value: number) {
  if (value <= 0) {
    return "0";
  }

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

async function getHomeData() {
  const [categoriesResult, resourcesResult] = await Promise.allSettled([
    listCategories(),
    listResources({
      status: "published",
      sortBy: "latest",
      page: 1,
      pageSize: 6,
    }),
  ]);

  const categories =
    categoriesResult.status === "fulfilled"
      ? categoriesResult.value.slice(0, 6)
      : fallbackCategories;

  const latestResources =
    resourcesResult.status === "fulfilled" ? resourcesResult.value.items : [];

  return {
    categories,
    latestResources,
  };
}

export default async function Home() {
  const { categories, latestResources } = await getHomeData();

  const totalFavorites = latestResources.reduce(
    (acc, resource) => acc + resource.favorite_count,
    0,
  );
  const totalDownloads = latestResources.reduce(
    (acc, resource) => acc + resource.download_count,
    0,
  );

  return (
    <div className="relative overflow-x-clip py-10 sm:py-14 lg:py-16">
      <Container className="space-y-12 sm:space-y-14">
        <section className="relative overflow-hidden rounded-[2rem] border border-[var(--stroke-soft)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-strong)] sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -left-16 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-[var(--brand-soft)]/65 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-0 h-80 w-80 rounded-full bg-[var(--accent-soft)]/65 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div className="space-y-6">
              <span className="inline-flex rounded-full border border-[var(--stroke-soft)] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-strong)]">
                ResourceHub Platform
              </span>
              <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-5xl">
                Curated resources for teams that ship products fast.
              </h1>
              <p className="max-w-xl text-base leading-7 text-[var(--text-muted)] sm:text-lg">
                Discover practical assets, publish your own toolkit, and keep every
                contribution in a moderated workflow that stays organized as your
                library grows.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/resources"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-[var(--text-inverse)] shadow-[var(--shadow-soft)] transition hover:bg-[var(--brand-strong)]"
                >
                  Browse resources
                </Link>
                <Link
                  href="/submit"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--stroke-strong)] bg-[var(--surface-card)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--brand)] hover:text-[var(--brand-strong)]"
                >
                  Publish a resource
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <article className="rounded-2xl border border-[var(--stroke-soft)] bg-white/82 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Latest picks
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                    {formatCompactNumber(latestResources.length)}
                  </p>
                </article>
                <article className="rounded-2xl border border-[var(--stroke-soft)] bg-white/82 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Favorites
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                    {formatCompactNumber(totalFavorites)}
                  </p>
                </article>
                <article className="rounded-2xl border border-[var(--stroke-soft)] bg-white/82 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Downloads
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                    {formatCompactNumber(totalDownloads)}
                  </p>
                </article>
              </div>
            </div>

            <aside className="rounded-3xl border border-[var(--stroke-soft)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-soft)] sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  What you get
                </h2>
                <span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--brand-strong)]">
                  Built for product teams
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {valuePillars.map((pillar) => (
                  <article
                    key={pillar.title}
                    className="rounded-2xl border border-[var(--stroke-soft)] bg-[var(--surface-muted)] p-4"
                  >
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">
                      {pillar.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                      {pillar.description}
                    </p>
                  </article>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-[var(--stroke-soft)] bg-[var(--surface-card)] p-6 shadow-[var(--shadow-soft)] sm:p-7">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Popular categories
            </h2>
            <p className="mt-2 text-base leading-7 text-[var(--text-muted)]">
              Navigate by topic and jump straight into high-signal resources.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/resources?category=${category.slug}`}
                  className="group rounded-2xl border border-[var(--stroke-soft)] bg-[var(--surface-muted)] px-4 py-4 transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:bg-white"
                >
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {category.name}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                    Curated results, practical filters, and cleaner discovery.
                  </p>
                  <p className="mt-3 text-sm font-semibold text-[var(--brand)] group-hover:text-[var(--brand-strong)]">
                    Explore category →
                  </p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--stroke-soft)] bg-[color:color-mix(in_oklab,var(--brand-soft)_62%,white_38%)] p-6 shadow-[var(--shadow-soft)] sm:p-7">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              How publishing works
            </h2>
            <p className="mt-2 text-base leading-7 text-[var(--text-muted)]">
              Keep submissions fast for contributors and reliable for consumers.
            </p>

            <ol className="mt-5 space-y-3">
              {publishFlow.map((step, index) => (
                <li
                  key={step}
                  className="flex gap-3 rounded-2xl border border-[var(--stroke-soft)] bg-white/85 p-4"
                >
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-semibold text-[var(--text-inverse)]">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-[var(--text-primary)]">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                Latest resources
              </h2>
              <p className="text-base leading-7 text-[var(--text-muted)]">
                Freshly approved assets from the community.
              </p>
            </div>
            <Link
              href="/resources"
              className="text-sm font-semibold text-[var(--brand)] transition hover:text-[var(--brand-strong)]"
            >
              Browse all resources →
            </Link>
          </div>

          {latestResources.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {latestResources.map((resource) => (
                <article
                  key={resource.id}
                  className="group flex h-full flex-col rounded-3xl border border-[var(--stroke-soft)] bg-[var(--surface-card)] p-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--brand)]"
                >
                  {resource.cover_url ? (
                    <div className="relative mb-4 overflow-hidden rounded-2xl border border-[var(--stroke-soft)] bg-[var(--surface-muted)]">
                      <Image
                        src={resource.cover_url}
                        alt={`${resource.title} cover`}
                        width={640}
                        height={360}
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        className="h-44 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                    </div>
                  ) : null}

                  <p className="text-xs font-medium text-[var(--text-muted)]">
                    {formatDateLabel(resource.published_at ?? resource.created_at)}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                    {resource.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-[var(--text-muted)]">
                    {summarizeText(resource.description, 135)}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
                    <span className="rounded-full border border-[var(--stroke-soft)] bg-[var(--surface-muted)] px-2.5 py-1">
                      {resource.favorite_count} favorites
                    </span>
                    <span className="rounded-full border border-[var(--stroke-soft)] bg-[var(--surface-muted)] px-2.5 py-1">
                      {resource.download_count} downloads
                    </span>
                  </div>

                  <Link
                    href={`/resources/${resource.id}`}
                    className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--stroke-strong)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--brand)] hover:text-[var(--brand-strong)]"
                  >
                    View details
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[var(--stroke-soft)] bg-[var(--surface-card)] p-8 text-center shadow-[var(--shadow-soft)]">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                No published resources yet
              </h3>
              <p className="mt-2 text-base leading-7 text-[var(--text-muted)]">
                Be the first contributor and submit a useful resource for review.
              </p>
              <Link
                href="/submit"
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-[var(--text-inverse)] transition hover:bg-[var(--brand-strong)]"
              >
                Publish resource
              </Link>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-[var(--stroke-soft)] bg-[color:color-mix(in_oklab,var(--accent-soft)_65%,white_35%)] p-7 shadow-[var(--shadow-soft)] sm:p-9">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
                Build a resource library your team can trust.
              </h2>
              <p className="mt-2 text-base leading-7 text-[var(--text-muted)]">
                Start with discoverable structure, moderation controls, and social
                feedback loops already included.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/resources"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--stroke-strong)] bg-[var(--surface-card)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--brand)] hover:text-[var(--brand-strong)]"
              >
                Explore catalog
              </Link>
              <Link
                href="/register"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-[var(--text-inverse)] transition hover:bg-[var(--brand-strong)]"
              >
                Create account
              </Link>
            </div>
          </div>
        </section>
      </Container>
    </div>
  );
}
