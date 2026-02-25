import Link from "next/link";

import { AlertMessage } from "@/components/feedback/alert-message";
import { Container } from "@/components/layout/container";
import { listCategories } from "@/lib/db/categories";
import {
  listResources,
  type ListResourcesResult,
  type ResourceSortBy,
} from "@/lib/db/resources";
import { listTags } from "@/lib/db/tags";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;
const TAG_FILTER_LIMIT = 16;
const SORT_OPTIONS: Array<{ value: ResourceSortBy; label: string }> = [
  { value: "latest", label: "Latest" },
  { value: "hot", label: "Most Favorited" },
  { value: "downloads", label: "Most Downloaded" },
];

type SearchParamValue = string | string[] | undefined;
type SearchParams = Record<string, SearchParamValue>;
type PageProps = {
  searchParams?: Promise<SearchParams>;
};

type ResourceFilters = {
  keyword: string;
  categorySlug: string;
  tagSlugs: string[];
  sortBy: ResourceSortBy;
  page: number;
};

function readFirstString(value: SearchParamValue): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const firstValue = value.find((item) => item.trim().length > 0);
    return firstValue?.trim();
  }

  return undefined;
}

function readListStrings(value: SearchParamValue): string[] {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];

  return values
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value || !/^\d+$/.test(value)) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return parsed > 0 ? parsed : fallback;
}

function parseSortBy(value: string | undefined): ResourceSortBy {
  const normalized = value?.trim();
  const matched = SORT_OPTIONS.find((option) => option.value === normalized);
  return matched?.value ?? "latest";
}

function parseFilters(searchParams: SearchParams): ResourceFilters {
  const keyword = readFirstString(searchParams.keyword) ?? "";
  const categorySlug =
    readFirstString(searchParams.category) ??
    readFirstString(searchParams.categoryId) ??
    "";
  const directTags = readListStrings(searchParams.tag);
  const groupedTags = readListStrings(searchParams.tags);
  const tagSlugs = [...new Set([...directTags, ...groupedTags].map((tag) => slugify(tag)).filter(Boolean))];

  return {
    keyword,
    categorySlug: slugify(categorySlug),
    tagSlugs,
    sortBy: parseSortBy(readFirstString(searchParams.sortBy)),
    page: parsePositiveInt(readFirstString(searchParams.page), 1),
  };
}

function buildQueryString(filters: ResourceFilters) {
  const search = new URLSearchParams();

  if (filters.keyword) {
    search.set("keyword", filters.keyword);
  }

  if (filters.categorySlug) {
    search.set("category", filters.categorySlug);
  }

  if (filters.sortBy !== "latest") {
    search.set("sortBy", filters.sortBy);
  }

  for (const tagSlug of filters.tagSlugs) {
    search.append("tag", tagSlug);
  }

  if (filters.page > 1) {
    search.set("page", String(filters.page));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

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

export default async function ResourcesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const filters = parseFilters(resolvedSearchParams);
  const loadErrors: string[] = [];
  const [categoriesResult, tagsResult] = await Promise.allSettled([
    listCategories(),
    listTags(TAG_FILTER_LIMIT),
  ]);
  const categories = categoriesResult.status === "fulfilled" ? categoriesResult.value : [];
  const tags = tagsResult.status === "fulfilled" ? tagsResult.value : [];

  if (categoriesResult.status === "rejected") {
    loadErrors.push("Failed to load categories.");
  }

  if (tagsResult.status === "rejected") {
    loadErrors.push("Failed to load tags.");
  }

  const selectedCategory = categories.find((category) => category.slug === filters.categorySlug);
  let resourcesResult: ListResourcesResult = {
    items: [],
    total: 0,
    page: filters.page,
    pageSize: PAGE_SIZE,
    totalPages: 0,
  };

  try {
    resourcesResult = await listResources({
      page: filters.page,
      pageSize: PAGE_SIZE,
      keyword: filters.keyword || undefined,
      categoryId: selectedCategory?.id,
      tagSlugs: filters.tagSlugs,
      sortBy: filters.sortBy,
      status: "published",
    });
  } catch {
    loadErrors.push("Failed to load resources.");
  }

  const categoryNameById = new Map(categories.map((category) => [category.id, category.name] as const));
  const totalItems = resourcesResult.total;
  const totalPages = resourcesResult.totalPages;
  const hasFilters = Boolean(filters.keyword || filters.categorySlug || filters.tagSlugs.length > 0);

  const previousHref = buildQueryString({
    ...filters,
    page: Math.max(1, filters.page - 1),
  });
  const nextHref = buildQueryString({
    ...filters,
    page: filters.page + 1,
  });

  return (
    <div className="py-10 sm:py-14">
      <Container className="space-y-6">
        <section className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Browse Resources
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">
            Search and filter community resources by keyword, category, and tags.
            Sorted lists help you discover the newest and most useful assets faster.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--stroke-soft)] bg-white p-5 shadow-sm sm:p-6">
          <form method="get" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Keyword</span>
                <input
                  name="keyword"
                  defaultValue={filters.keyword}
                  placeholder="Search by title or description..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Sort by</span>
                <select
                  name="sortBy"
                  defaultValue={filters.sortBy}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Category</span>
                <select
                  name="category"
                  defaultValue={selectedCategory?.slug ?? ""}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Popular tags</span>
                <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  {tags.length > 0 ? (
                    tags.map((tag) => (
                      <label
                        key={tag.id}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400"
                      >
                        <input
                          type="checkbox"
                          name="tag"
                          value={tag.slug}
                          defaultChecked={filters.tagSlugs.includes(tag.slug)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                        />
                        {tag.name}
                      </label>
                    ))
                  ) : (
                    <p className="text-xs text-[var(--text-muted)]">No tags available now.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="rounded-full bg-[var(--brand)] px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Apply filters
              </button>
              <Link
                href="/resources"
                className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400"
              >
                Reset
              </Link>
              <p className="text-xs text-[var(--text-muted)]">
                Showing {resourcesResult.items.length} of {totalItems} results.
              </p>
            </div>
          </form>
        </section>

        {loadErrors.length > 0 ? (
          <AlertMessage
            variant="warning"
            title="Partial data unavailable"
            message={
              <div className="space-y-1">
                <p>Please check environment setup and database migrations.</p>
                <ul className="list-disc pl-5">
                  {loadErrors.map((errorMessage) => (
                    <li key={errorMessage}>{errorMessage}</li>
                  ))}
                </ul>
              </div>
            }
          />
        ) : null}

        {resourcesResult.items.length > 0 ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {resourcesResult.items.map((resource) => (
                <article
                  key={resource.id}
                  className="rounded-2xl border border-[var(--stroke-soft)] bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-[var(--text-muted)]">
                      {formatDateLabel(resource.published_at ?? resource.created_at)}
                    </p>
                    {resource.category_id ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {categoryNameById.get(resource.category_id) ?? "Category"}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-slate-900">{resource.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                    {summarizeText(resource.description, 140)}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">
                      {resource.favorite_count} favorites
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">
                      {resource.download_count} downloads
                    </span>
                  </div>
                  <Link
                    href={`/resources/${resource.id}`}
                    className="mt-4 inline-flex text-sm font-semibold text-[var(--brand)] transition hover:text-blue-700"
                  >
                    View details →
                  </Link>
                </article>
              ))}
            </section>

            {totalPages > 1 ? (
              <nav className="flex flex-wrap items-center justify-center gap-2">
                <Link
                  href={previousHref}
                  aria-disabled={filters.page <= 1}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 aria-disabled:pointer-events-none aria-disabled:opacity-40"
                >
                  Previous
                </Link>
                <span className="text-sm text-[var(--text-muted)]">
                  Page {filters.page} of {totalPages}
                </span>
                <Link
                  href={nextHref}
                  aria-disabled={filters.page >= totalPages}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 aria-disabled:pointer-events-none aria-disabled:opacity-40"
                >
                  Next
                </Link>
              </nav>
            ) : null}
          </>
        ) : (
          <section className="rounded-2xl border border-dashed border-[var(--stroke-soft)] bg-white p-10 text-center">
            <h2 className="text-xl font-semibold text-slate-900">No resources found</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {hasFilters
                ? "Try adjusting keyword, category, or tags to broaden your search."
                : "No published resources are available yet. Come back soon or publish your own."}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              {hasFilters ? (
                <Link
                  href="/resources"
                  className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400"
                >
                  Clear filters
                </Link>
              ) : null}
              <Link
                href="/submit"
                className="rounded-full bg-[var(--brand)] px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Publish resource
              </Link>
            </div>
          </section>
        )}
      </Container>
    </div>
  );
}
