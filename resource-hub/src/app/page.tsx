import Link from "next/link";

import { Container } from "@/components/layout/container";
import { listCategories } from "@/lib/db/categories";
import { listResources } from "@/lib/db/resources";

export const dynamic = "force-dynamic";

const fallbackCategories = [
  { id: "design", name: "Design Assets", slug: "design-assets" },
  { id: "frontend", name: "Frontend Kits", slug: "frontend-kits" },
  { id: "backend", name: "Backend Templates", slug: "backend-templates" },
  { id: "ai", name: "AI Resources", slug: "ai-resources" },
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

  return (
    <div className="py-16 sm:py-20">
      <Container className="space-y-8">
        <section className="rounded-3xl border border-[var(--stroke-soft)] bg-[var(--surface-elevated)] p-8 shadow-sm sm:p-12">
          <span className="inline-flex rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand)]">
            Resource Sharing Platform
          </span>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Discover practical resources and publish your own in minutes.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-muted)] sm:text-lg">
            ResourceHub helps teams share templates, datasets, and toolkits with
            searchable metadata, moderation workflow, and social interactions.
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

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Popular Categories
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                Jump into high-demand topics and start exploring quickly.
              </p>
            </div>
            <Link
              href="/resources"
              className="text-sm font-semibold text-[var(--brand)] transition hover:text-blue-700"
            >
              View all categories →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/resources?category=${category.slug}`}
                className="rounded-2xl border border-[var(--stroke-soft)] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
              >
                <div className="inline-flex rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--brand)]">
                  Category
                </div>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">
                  {category.name}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  Browse curated resources related to {category.name}.
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Latest Resources
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                Freshly published assets from the community.
              </p>
            </div>
            <Link
              href="/resources"
              className="text-sm font-semibold text-[var(--brand)] transition hover:text-blue-700"
            >
              Browse all resources →
            </Link>
          </div>

          {latestResources.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {latestResources.map((resource) => (
                <article
                  key={resource.id}
                  className="rounded-2xl border border-[var(--stroke-soft)] bg-white p-5 shadow-sm"
                >
                  <p className="text-xs font-medium text-[var(--text-muted)]">
                    {formatDateLabel(resource.published_at ?? resource.created_at)}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">
                    {resource.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                    {summarizeText(resource.description, 120)}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-600">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">
                      {resource.favorite_count} favorites
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">
                      {resource.download_count} downloads
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--stroke-soft)] bg-white p-7 text-center">
              <h3 className="text-lg font-semibold text-slate-900">
                No published resources yet
              </h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Be the first contributor and submit a useful resource for review.
              </p>
              <Link
                href="/submit"
                className="mt-4 inline-flex rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Publish Resource
              </Link>
            </div>
          )}
        </section>
      </Container>
    </div>
  );
}
