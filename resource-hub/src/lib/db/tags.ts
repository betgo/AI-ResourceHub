import "server-only";

import { slugify } from "@/lib/slug";
import { createAdminClient } from "@/lib/supabase/admin";

const TAG_COLUMNS = "id, name, slug, created_at";
const DEFAULT_TAG_LIMIT = 50;
const MAX_TAG_LIMIT = 200;

export type Tag = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export type CreateTagInput = {
  name: string;
  slug?: string;
};

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeId(value: string): string {
  return value.trim();
}

function normalizeLimit(limit: number | undefined): number {
  if (!limit || Number.isNaN(limit) || limit < 1) {
    return DEFAULT_TAG_LIMIT;
  }

  return Math.min(Math.floor(limit), MAX_TAG_LIMIT);
}

function escapeForLike(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function toTagSlug(input: CreateTagInput, normalizedName: string): string {
  return slugify(input.slug ?? normalizedName);
}

function dedupeTagInputs(tagNames: string[]): Array<{ name: string; slug: string }> {
  const uniqueBySlug = new Map<string, { name: string; slug: string }>();

  for (const rawName of tagNames) {
    const normalizedName = normalizeName(rawName);

    if (!normalizedName) {
      continue;
    }

    const slug = slugify(normalizedName);

    if (!slug || uniqueBySlug.has(slug)) {
      continue;
    }

    uniqueBySlug.set(slug, {
      name: normalizedName,
      slug,
    });
  }

  return [...uniqueBySlug.values()];
}

export async function listTags(limit?: number): Promise<Tag[]> {
  const admin = createAdminClient();
  const rowLimit = normalizeLimit(limit);

  const { data, error } = await admin
    .from("tags")
    .select(TAG_COLUMNS)
    .order("name", { ascending: true })
    .limit(rowLimit);

  if (error) {
    throw new Error(`Failed to list tags: ${error.message}`);
  }

  return data ?? [];
}

export async function listTagsByResource(resourceId: string): Promise<Tag[]> {
  const normalizedResourceId = normalizeId(resourceId);

  if (!normalizedResourceId) {
    return [];
  }

  const admin = createAdminClient();
  const { data: links, error: linksError } = await admin
    .from("resource_tags")
    .select("tag_id")
    .eq("resource_id", normalizedResourceId);

  if (linksError) {
    throw new Error(`Failed to list resource tags: ${linksError.message}`);
  }

  const tagIds = [...new Set((links ?? []).map((link) => link.tag_id).filter(Boolean))];

  if (tagIds.length === 0) {
    return [];
  }

  const { data, error } = await admin
    .from("tags")
    .select(TAG_COLUMNS)
    .in("id", tagIds)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to list tags by resource: ${error.message}`);
  }

  return data ?? [];
}

export async function searchTags(keyword: string, limit?: number): Promise<Tag[]> {
  const normalizedKeyword = normalizeName(keyword);

  if (!normalizedKeyword) {
    return [];
  }

  const admin = createAdminClient();
  const rowLimit = normalizeLimit(limit);
  const escapedKeyword = escapeForLike(normalizedKeyword);
  const likePattern = `%${escapedKeyword}%`;

  const { data, error } = await admin
    .from("tags")
    .select(TAG_COLUMNS)
    .or(`name.ilike.${likePattern},slug.ilike.${likePattern}`)
    .order("name", { ascending: true })
    .limit(rowLimit);

  if (error) {
    throw new Error(`Failed to search tags: ${error.message}`);
  }

  return data ?? [];
}

export async function createTag(input: CreateTagInput): Promise<Tag> {
  const normalizedName = normalizeName(input.name);

  if (!normalizedName) {
    throw new Error("Tag name cannot be empty.");
  }

  const normalizedSlug = toTagSlug(input, normalizedName);

  if (!normalizedSlug) {
    throw new Error("Tag slug cannot be empty.");
  }

  const admin = createAdminClient();

  const { data: existing, error: existingError } = await admin
    .from("tags")
    .select(TAG_COLUMNS)
    .eq("slug", normalizedSlug)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to query tag by slug: ${existingError.message}`);
  }

  if (existing) {
    return existing;
  }

  const { data, error } = await admin
    .from("tags")
    .insert({
      name: normalizedName,
      slug: normalizedSlug,
    })
    .select(TAG_COLUMNS)
    .single();

  if (!error) {
    return data;
  }

  if (error.code === "23505") {
    const { data: conflicted } = await admin
      .from("tags")
      .select(TAG_COLUMNS)
      .eq("slug", normalizedSlug)
      .maybeSingle();

    if (conflicted) {
      return conflicted;
    }
  }

  throw new Error(`Failed to create tag: ${error.message}`);
}

export async function createTags(tagNames: string[]): Promise<Tag[]> {
  const uniqueInputs = dedupeTagInputs(tagNames);

  if (uniqueInputs.length === 0) {
    return [];
  }

  const admin = createAdminClient();
  const slugs = uniqueInputs.map((item) => item.slug);

  const { data: existingTags, error: existingError } = await admin
    .from("tags")
    .select(TAG_COLUMNS)
    .in("slug", slugs);

  if (existingError) {
    throw new Error(`Failed to query existing tags: ${existingError.message}`);
  }

  const existingBySlug = new Map((existingTags ?? []).map((tag) => [tag.slug, tag] as const));
  const inserts = uniqueInputs.filter((item) => !existingBySlug.has(item.slug));

  if (inserts.length > 0) {
    const { data: insertedTags, error: insertError } = await admin
      .from("tags")
      .insert(inserts)
      .select(TAG_COLUMNS);

    if (insertError && insertError.code !== "23505") {
      throw new Error(`Failed to create tags: ${insertError.message}`);
    }

    for (const tag of insertedTags ?? []) {
      existingBySlug.set(tag.slug, tag);
    }
  }

  const { data: latestTags, error: latestError } = await admin
    .from("tags")
    .select(TAG_COLUMNS)
    .in("slug", slugs);

  if (latestError) {
    throw new Error(`Failed to load created tags: ${latestError.message}`);
  }

  const latestBySlug = new Map((latestTags ?? []).map((tag) => [tag.slug, tag] as const));

  return uniqueInputs
    .map((item) => latestBySlug.get(item.slug))
    .filter((tag): tag is Tag => Boolean(tag));
}
