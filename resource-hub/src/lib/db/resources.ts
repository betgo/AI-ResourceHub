import "server-only";

import { slugify } from "@/lib/slug";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type Resource = Database["public"]["Tables"]["resources"]["Row"];
type ResourceInsert = Database["public"]["Tables"]["resources"]["Insert"];
type ResourceUpdate = Database["public"]["Tables"]["resources"]["Update"];
type ResourceStatus = Database["public"]["Enums"]["resource_status"];

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 100;

export type CreateResourceInput = {
  ownerId: string;
  categoryId?: string | null;
  title: string;
  description: string;
  fileUrl: string;
  coverUrl?: string | null;
  status?: ResourceStatus;
};

export type UpdateResourceInput = {
  id: string;
  ownerId?: string;
  categoryId?: string | null;
  title?: string;
  description?: string;
  fileUrl?: string;
  coverUrl?: string | null;
};

export type ResourceSortBy = "latest" | "hot" | "downloads";

export type ListResourcesParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  categoryId?: string;
  tagIds?: string[];
  tagSlugs?: string[];
  status?: ResourceStatus;
  ownerId?: string;
  sortBy?: ResourceSortBy;
};

export type ListResourcesResult = {
  items: Resource[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeId(value: string): string {
  return value.trim();
}

function normalizePositiveInt(value: number | undefined, fallback: number): number {
  if (!value || Number.isNaN(value) || value < 1) {
    return fallback;
  }

  return Math.floor(value);
}

function normalizePage(value: number | undefined): number {
  return normalizePositiveInt(value, DEFAULT_PAGE);
}

function normalizePageSize(value: number | undefined): number {
  return Math.min(normalizePositiveInt(value, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
}

function dedupeStrings(values: string[] | undefined): string[] {
  if (!values) {
    return [];
  }

  const normalized = values.map((value) => value.trim()).filter(Boolean);

  return [...new Set(normalized)];
}

async function resolveTagIds(tagIds: string[] | undefined, tagSlugs: string[] | undefined) {
  const directTagIds = dedupeStrings(tagIds);
  const normalizedTagSlugs = dedupeStrings(tagSlugs).map((slug) => slugify(slug)).filter(Boolean);

  if (directTagIds.length === 0 && normalizedTagSlugs.length === 0) {
    return null;
  }

  const admin = createAdminClient();
  let resolvedTagIds = [...directTagIds];

  if (normalizedTagSlugs.length > 0) {
    const { data: tagRows, error: tagError } = await admin
      .from("tags")
      .select("id")
      .in("slug", normalizedTagSlugs);

    if (tagError) {
      throw new Error(`Failed to resolve tags from slugs: ${tagError.message}`);
    }

    resolvedTagIds = [
      ...new Set([...resolvedTagIds, ...(tagRows ?? []).map((row) => row.id)]),
    ];
  }

  return resolvedTagIds;
}

async function resolveResourceIdsByTags(tagIds: string[] | undefined, tagSlugs: string[] | undefined) {
  const resolvedTagIds = await resolveTagIds(tagIds, tagSlugs);

  if (!resolvedTagIds) {
    return null;
  }

  if (resolvedTagIds.length === 0) {
    return [];
  }

  const admin = createAdminClient();
  const { data: links, error: linkError } = await admin
    .from("resource_tags")
    .select("resource_id, tag_id")
    .in("tag_id", resolvedTagIds);

  if (linkError) {
    throw new Error(`Failed to query resource tags: ${linkError.message}`);
  }

  const matchedByResource = new Map<string, Set<string>>();

  for (const link of links ?? []) {
    if (!matchedByResource.has(link.resource_id)) {
      matchedByResource.set(link.resource_id, new Set());
    }

    matchedByResource.get(link.resource_id)?.add(link.tag_id);
  }

  return [...matchedByResource.entries()]
    .filter(([, matchedTags]) => matchedTags.size === resolvedTagIds.length)
    .map(([resourceId]) => resourceId);
}

function buildStatusPatch(status: ResourceStatus, reviewReason?: string | null): ResourceUpdate {
  if (status === "published") {
    return {
      status,
      review_reason: null,
      published_at: new Date().toISOString(),
      rejected_at: null,
    };
  }

  if (status === "rejected") {
    return {
      status,
      review_reason: reviewReason?.trim() || null,
      rejected_at: new Date().toISOString(),
      published_at: null,
    };
  }

  return {
    status,
    review_reason: null,
    published_at: null,
    rejected_at: null,
  };
}

export async function createResource(input: CreateResourceInput): Promise<Resource> {
  const ownerId = normalizeId(input.ownerId);
  const title = normalizeText(input.title);
  const description = normalizeText(input.description);
  const fileUrl = input.fileUrl.trim();

  if (!ownerId) {
    throw new Error("ownerId is required.");
  }

  if (!title) {
    throw new Error("title is required.");
  }

  if (!description) {
    throw new Error("description is required.");
  }

  if (!fileUrl) {
    throw new Error("fileUrl is required.");
  }

  const insertPayload: ResourceInsert = {
    owner_id: ownerId,
    category_id: input.categoryId ?? null,
    title,
    description,
    file_url: fileUrl,
    cover_url: input.coverUrl ?? null,
    status: input.status ?? "pending",
  };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("resources")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create resource: ${error.message}`);
  }

  return data as Resource;
}

export async function getResourceById(resourceId: string): Promise<Resource | null> {
  const normalizedId = normalizeId(resourceId);

  if (!normalizedId) {
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("resources")
    .select("*")
    .eq("id", normalizedId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch resource by id: ${error.message}`);
  }

  return data as Resource | null;
}

export async function updateResource(input: UpdateResourceInput): Promise<Resource | null> {
  const normalizedId = normalizeId(input.id);

  if (!normalizedId) {
    throw new Error("id is required.");
  }

  const patch: ResourceUpdate = {};

  if (input.categoryId !== undefined) {
    patch.category_id = input.categoryId;
  }

  if (input.title !== undefined) {
    const title = normalizeText(input.title);

    if (!title) {
      throw new Error("title cannot be empty.");
    }

    patch.title = title;
  }

  if (input.description !== undefined) {
    const description = normalizeText(input.description);

    if (!description) {
      throw new Error("description cannot be empty.");
    }

    patch.description = description;
  }

  if (input.fileUrl !== undefined) {
    const fileUrl = input.fileUrl.trim();

    if (!fileUrl) {
      throw new Error("fileUrl cannot be empty.");
    }

    patch.file_url = fileUrl;
  }

  if (input.coverUrl !== undefined) {
    patch.cover_url = input.coverUrl;
  }

  if (Object.keys(patch).length === 0) {
    throw new Error("No update fields provided.");
  }

  const admin = createAdminClient();
  let query = admin.from("resources").update(patch).eq("id", normalizedId);

  if (input.ownerId) {
    query = query.eq("owner_id", normalizeId(input.ownerId));
  }

  const { data, error } = await query.select("*").maybeSingle();

  if (error) {
    throw new Error(`Failed to update resource: ${error.message}`);
  }

  return data as Resource | null;
}

export async function deleteResource(resourceId: string, ownerId?: string): Promise<boolean> {
  const normalizedId = normalizeId(resourceId);

  if (!normalizedId) {
    throw new Error("resourceId is required.");
  }

  const admin = createAdminClient();
  let query = admin.from("resources").delete().eq("id", normalizedId);

  if (ownerId) {
    query = query.eq("owner_id", normalizeId(ownerId));
  }

  const { data, error } = await query.select("id").maybeSingle();

  if (error) {
    throw new Error(`Failed to delete resource: ${error.message}`);
  }

  return Boolean(data);
}

export async function updateResourceStatus(
  resourceId: string,
  status: ResourceStatus,
  reviewReason?: string | null,
): Promise<Resource | null> {
  const normalizedId = normalizeId(resourceId);

  if (!normalizedId) {
    throw new Error("resourceId is required.");
  }

  const patch = buildStatusPatch(status, reviewReason);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("resources")
    .update(patch)
    .eq("id", normalizedId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update resource status: ${error.message}`);
  }

  return data as Resource | null;
}

export async function listResources(params: ListResourcesParams = {}): Promise<ListResourcesResult> {
  const page = normalizePage(params.page);
  const pageSize = normalizePageSize(params.pageSize);
  const keyword = params.keyword?.trim();
  const categoryId = params.categoryId?.trim();
  const ownerId = params.ownerId?.trim();
  const sortBy = params.sortBy ?? "latest";
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const matchedResourceIds = await resolveResourceIdsByTags(params.tagIds, params.tagSlugs);

  if (matchedResourceIds && matchedResourceIds.length === 0) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  const admin = createAdminClient();
  let query = admin.from("resources").select("*", { count: "exact" });

  if (params.status) {
    query = query.eq("status", params.status);
  }

  if (ownerId) {
    query = query.eq("owner_id", ownerId);
  }

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (keyword) {
    query = query.textSearch("search_vector", keyword, {
      config: "simple",
      type: "websearch",
    });
  }

  if (matchedResourceIds) {
    query = query.in("id", matchedResourceIds);
  }

  if (sortBy === "hot") {
    query = query.order("favorite_count", { ascending: false }).order("created_at", {
      ascending: false,
    });
  } else if (sortBy === "downloads") {
    query = query.order("download_count", { ascending: false }).order("created_at", {
      ascending: false,
    });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw new Error(`Failed to list resources: ${error.message}`);
  }

  const total = count ?? 0;

  return {
    items: (data ?? []) as Resource[],
    total,
    page,
    pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}
