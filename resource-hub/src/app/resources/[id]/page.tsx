import Link from "next/link";
import { notFound } from "next/navigation";

import { ResourceDetailInteractions } from "@/components/resources/resource-detail-interactions";
import { Container } from "@/components/layout/container";
import { listCategories } from "@/lib/db/categories";
import { listCommentsByResource } from "@/lib/db/comments";
import { isResourceFavoritedByUser } from "@/lib/db/favorites";
import { getResourceById } from "@/lib/db/resources";
import { listTagsByResource } from "@/lib/db/tags";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeId(value: string) {
  return value.trim();
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

function formatAuthorLabel(ownerId: string) {
  if (!ownerId) {
    return "Unknown";
  }

  return `User ${ownerId.slice(0, 8)}`;
}

function toLoginHref(resourceId: string) {
  const nextPath = `/resources/${resourceId}`;
  return `/login?next=${encodeURIComponent(nextPath)}`;
}

function toCoverBackground(url: string) {
  return `url("${url.replaceAll('"', "%22")}")`;
}

export default async function ResourceDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const resourceId = normalizeId(resolvedParams.id ?? "");

  if (!resourceId) {
    notFound();
  }

  let resource = null;

  try {
    resource = await getResourceById(resourceId);
  } catch {
    notFound();
  }

  if (!resource || resource.status !== "published") {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [categoriesResult, tagsResult, commentsResult, favoriteStateResult] =
    await Promise.allSettled([
      listCategories(),
      listTagsByResource(resource.id),
      listCommentsByResource({
        resourceId: resource.id,
        page: 1,
        pageSize: 20,
      }),
      user
        ? isResourceFavoritedByUser({
            userId: user.id,
            resourceId: resource.id,
          })
        : Promise.resolve(false),
    ]);

  const loadWarnings: string[] = [];
  const categories = categoriesResult.status === "fulfilled" ? categoriesResult.value : [];
  const tags = tagsResult.status === "fulfilled" ? tagsResult.value : [];
  const commentsData =
    commentsResult.status === "fulfilled"
      ? commentsResult.value
      : {
          items: [],
          total: 0,
        };
  const initialIsFavorited =
    favoriteStateResult.status === "fulfilled" ? favoriteStateResult.value : false;

  if (categoriesResult.status === "rejected") {
    loadWarnings.push("Failed to load category information.");
  }

  if (tagsResult.status === "rejected") {
    loadWarnings.push("Failed to load tag information.");
  }

  const commentError =
    commentsResult.status === "rejected" ? "Failed to load comments for now." : null;
  const categoryName =
    categories.find((category) => category.id === resource.category_id)?.name ?? "Uncategorized";
  const publishDate = formatDateLabel(resource.published_at ?? resource.created_at);

  return (
    <div className="py-10 sm:py-14">
      <Container className="space-y-6">
        <section className="space-y-2">
          <Link
            href="/resources"
            className="inline-flex text-sm font-semibold text-[var(--brand)] transition hover:text-blue-700"
          >
            ← Back to resources
          </Link>
          <p className="text-sm text-[var(--text-muted)]">
            Published on {publishDate} · by {formatAuthorLabel(resource.owner_id)}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {resource.title}
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-[var(--text-muted)] sm:text-base">
            {resource.description}
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {categoryName}
            </span>
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand)]"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        </section>

        {loadWarnings.length > 0 ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Some metadata is temporarily unavailable.
          </section>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-[var(--stroke-soft)] bg-white shadow-sm">
          {resource.cover_url ? (
            <div
              role="img"
              aria-label={`${resource.title} cover`}
              className="h-64 w-full bg-cover bg-center sm:h-80"
              style={{
                backgroundImage: toCoverBackground(resource.cover_url),
              }}
            />
          ) : (
            <div className="flex h-64 w-full items-center justify-center bg-slate-100 text-sm text-[var(--text-muted)] sm:h-80">
              No cover image uploaded
            </div>
          )}
        </section>

        <ResourceDetailInteractions
          resourceId={resource.id}
          fileUrl={resource.file_url}
          loginHref={toLoginHref(resource.id)}
          canInteract={Boolean(user)}
          initialIsFavorited={initialIsFavorited}
          initialFavoriteCount={resource.favorite_count}
          initialDownloadCount={resource.download_count}
          initialComments={commentsData.items}
          initialCommentTotal={commentsData.total}
          initialCommentError={commentError}
        />
      </Container>
    </div>
  );
}
