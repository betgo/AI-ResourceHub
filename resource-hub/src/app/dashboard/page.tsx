import Link from "next/link";
import { redirect } from "next/navigation";

import { Container } from "@/components/layout/container";
import { listCategories } from "@/lib/db/categories";
import { listDownloadsByUser } from "@/lib/db/downloads";
import { listFavoritesByUser } from "@/lib/db/favorites";
import { listResources, listResourcesByIds } from "@/lib/db/resources";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type Resource = Database["public"]["Tables"]["resources"]["Row"];
type Favorite = Database["public"]["Tables"]["favorites"]["Row"];
type Download = Database["public"]["Tables"]["downloads"]["Row"];
type ResourceStatus = Database["public"]["Enums"]["resource_status"];

type ResourceStatusGroup = {
  key: ResourceStatus;
  label: string;
  description: string;
};

type FavoriteWithResource = {
  favorite: Favorite;
  resource: Resource | null;
};

type DownloadWithResource = {
  download: Download;
  resource: Resource | null;
};

const RESOURCE_GROUPS: ResourceStatusGroup[] = [
  {
    key: "pending",
    label: "Pending Review",
    description: "Waiting for admin moderation.",
  },
  {
    key: "published",
    label: "Published",
    description: "Visible to all visitors.",
  },
  {
    key: "rejected",
    label: "Rejected",
    description: "Requires updates before re-submission.",
  },
];

function formatDateLabel(value: string | null) {
  if (!value) {
    return "Recently";
  }

  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

function summarizeText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function getResourceStatusBadgeClass(status: ResourceStatus) {
  if (status === "published") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "rejected") {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-amber-100 text-amber-700";
}

function getResourceStatusLabel(status: ResourceStatus) {
  if (status === "published") {
    return "Published";
  }

  if (status === "rejected") {
    return "Rejected";
  }

  return "Pending";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=%2Fdashboard");
  }

  const loadWarnings: string[] = [];
  const [categoriesResult, resourcesResult, favoritesResult, downloadsResult] =
    await Promise.allSettled([
      listCategories(),
      listResources({
        ownerId: user.id,
        page: 1,
        pageSize: 90,
        sortBy: "latest",
      }),
      listFavoritesByUser({
        userId: user.id,
        page: 1,
        pageSize: 12,
      }),
      listDownloadsByUser({
        userId: user.id,
        page: 1,
        pageSize: 12,
      }),
    ]);

  if (categoriesResult.status === "rejected") {
    loadWarnings.push("Failed to load category metadata.");
  }

  if (resourcesResult.status === "rejected") {
    loadWarnings.push("Failed to load your resources.");
  }

  if (favoritesResult.status === "rejected") {
    loadWarnings.push("Failed to load favorite history.");
  }

  if (downloadsResult.status === "rejected") {
    loadWarnings.push("Failed to load download history.");
  }

  const categories = categoriesResult.status === "fulfilled" ? categoriesResult.value : [];
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name] as const));
  const ownedResources = resourcesResult.status === "fulfilled" ? resourcesResult.value.items : [];
  const favoriteRows = favoritesResult.status === "fulfilled" ? favoritesResult.value.items : [];
  const downloadRows = downloadsResult.status === "fulfilled" ? downloadsResult.value.items : [];

  const relatedResourceIds = [...new Set([
    ...favoriteRows.map((favorite) => favorite.resource_id),
    ...downloadRows.map((download) => download.resource_id),
  ])];

  let relatedResourceMap = new Map<string, Resource>();

  if (relatedResourceIds.length > 0) {
    try {
      const relatedResources = await listResourcesByIds(relatedResourceIds);
      relatedResourceMap = new Map(relatedResources.map((resource) => [resource.id, resource] as const));
    } catch {
      loadWarnings.push("Failed to enrich favorites/downloads with resource metadata.");
    }
  }

  const groupedResources: Record<ResourceStatus, Resource[]> = {
    pending: [],
    published: [],
    rejected: [],
  };

  for (const resource of ownedResources) {
    groupedResources[resource.status].push(resource);
  }

  const favoriteItems: FavoriteWithResource[] = favoriteRows.map((favorite) => ({
    favorite,
    resource: relatedResourceMap.get(favorite.resource_id) ?? null,
  }));
  const downloadItems: DownloadWithResource[] = downloadRows.map((download) => ({
    download,
    resource: relatedResourceMap.get(download.resource_id) ?? null,
  }));
  const displayName = user.email?.split("@")[0] || "Creator";

  return (
    <div className="py-10 sm:py-14">
      <Container className="space-y-8">
        <section className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {displayName}&apos;s Dashboard
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">
            Track your resource lifecycle, revisit favorites, and review download history in one place.
          </p>
        </section>

        {loadWarnings.length > 0 ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Some data is temporarily unavailable. Displayed content may be incomplete.
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-[var(--stroke-soft)] bg-white p-5 shadow-sm">
            <p className="text-sm text-[var(--text-muted)]">My resources</p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">{ownedResources.length}</p>
          </article>
          <article className="rounded-2xl border border-[var(--stroke-soft)] bg-white p-5 shadow-sm">
            <p className="text-sm text-[var(--text-muted)]">Favorites</p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">{favoriteRows.length}</p>
          </article>
          <article className="rounded-2xl border border-[var(--stroke-soft)] bg-white p-5 shadow-sm">
            <p className="text-sm text-[var(--text-muted)]">Downloads</p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">{downloadRows.length}</p>
          </article>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">My Resources</h2>
              <p className="text-sm text-[var(--text-muted)]">
                Grouped by review status with quick edit access.
              </p>
            </div>
            <Link
              href="/submit"
              className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Publish new
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {RESOURCE_GROUPS.map((group) => {
              const items = groupedResources[group.key];

              return (
                <article
                  key={group.key}
                  className="rounded-2xl border border-[var(--stroke-soft)] bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-slate-900">{group.label}</h3>
                      <p className="text-xs text-[var(--text-muted)]">{group.description}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {items.length}
                    </span>
                  </div>

                  {items.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {items.map((resource) => (
                        <div
                          key={resource.id}
                          className="rounded-xl border border-[var(--stroke-soft)] bg-slate-50 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="line-clamp-1 text-sm font-semibold text-slate-900">
                              {resource.title}
                            </p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${getResourceStatusBadgeClass(resource.status)}`}
                            >
                              {getResourceStatusLabel(resource.status)}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">
                            {summarizeText(resource.description, 92)}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                            <span>{formatDateLabel(resource.created_at)}</span>
                            <span>•</span>
                            <span>
                              {categoryNameById.get(resource.category_id ?? "") ?? "Uncategorized"}
                            </span>
                          </div>

                          {resource.status === "rejected" && resource.review_reason ? (
                            <p className="mt-2 rounded-lg bg-rose-50 px-2 py-1 text-[11px] text-rose-700">
                              Reason: {resource.review_reason}
                            </p>
                          ) : null}

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Link
                              href={`/dashboard/resources/${resource.id}/edit`}
                              className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-slate-400"
                            >
                              Edit
                            </Link>
                            {resource.status === "published" ? (
                              <Link
                                href={`/resources/${resource.id}`}
                                className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-[var(--brand)] transition hover:border-blue-300"
                              >
                                View details
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 rounded-xl border border-dashed border-[var(--stroke-soft)] bg-slate-50 px-3 py-4 text-xs text-[var(--text-muted)]">
                      No resources in this status.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-[var(--stroke-soft)] bg-white p-5 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">My Favorites</h2>
              <p className="text-sm text-[var(--text-muted)]">
                Quick access to resources you bookmarked.
              </p>
            </div>

            {favoriteItems.length > 0 ? (
              <div className="mt-4 space-y-3">
                {favoriteItems.map((item) => (
                  <div
                    key={`${item.favorite.resource_id}-${item.favorite.created_at}`}
                    className="rounded-xl border border-[var(--stroke-soft)] bg-slate-50 p-3"
                  >
                    <p className="line-clamp-1 text-sm font-semibold text-slate-900">
                      {item.resource?.title ?? `Resource ${item.favorite.resource_id.slice(0, 8)}`}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Favorited on {formatDateLabel(item.favorite.created_at)}
                    </p>
                    {item.resource ? (
                      <div className="mt-2">
                        {item.resource.status === "published" ? (
                          <Link
                            href={`/resources/${item.resource.id}`}
                            className="text-xs font-semibold text-[var(--brand)] transition hover:text-blue-700"
                          >
                            Open resource →
                          </Link>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">
                            Resource is no longer publicly available.
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-[var(--stroke-soft)] bg-slate-50 px-4 py-6 text-sm text-[var(--text-muted)]">
                You have not favorited any resource yet.
                <Link href="/resources" className="ml-2 font-semibold text-[var(--brand)]">
                  Browse now
                </Link>
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-[var(--stroke-soft)] bg-white p-5 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                Download History
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                Review recent downloads and revisit source pages.
              </p>
            </div>

            {downloadItems.length > 0 ? (
              <div className="mt-4 space-y-3">
                {downloadItems.map((item) => (
                  <div
                    key={item.download.id}
                    className="rounded-xl border border-[var(--stroke-soft)] bg-slate-50 p-3"
                  >
                    <p className="line-clamp-1 text-sm font-semibold text-slate-900">
                      {item.resource?.title ?? `Resource ${item.download.resource_id.slice(0, 8)}`}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Downloaded on {formatDateLabel(item.download.created_at)}
                    </p>
                    {item.resource ? (
                      <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
                        {item.resource.status === "published" ? (
                          <Link
                            href={`/resources/${item.resource.id}`}
                            className="text-[var(--brand)] transition hover:text-blue-700"
                          >
                            View resource
                          </Link>
                        ) : (
                          <span className="text-[var(--text-muted)]">
                            Resource not publicly available
                          </span>
                        )}
                        <a
                          href={item.resource.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-700 transition hover:text-slate-900"
                        >
                          Download again
                        </a>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-[var(--stroke-soft)] bg-slate-50 px-4 py-6 text-sm text-[var(--text-muted)]">
                No download records yet.
              </div>
            )}
          </article>
        </section>
      </Container>
    </div>
  );
}
