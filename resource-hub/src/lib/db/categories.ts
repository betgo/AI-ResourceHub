import "server-only";

import { slugify } from "@/lib/slug";
import { createAdminClient } from "@/lib/supabase/admin";

const CATEGORY_COLUMNS = "id, name, slug, created_at";

export type Category = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export type CreateCategoryInput = {
  name: string;
  slug?: string;
};

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function toCategorySlug(input: CreateCategoryInput, normalizedName: string): string {
  return slugify(input.slug ?? normalizedName);
}

export async function listCategories(): Promise<Category[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("categories")
    .select(CATEGORY_COLUMNS)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to list categories: ${error.message}`);
  }

  return data ?? [];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const normalizedSlug = slugify(slug);

  if (!normalizedSlug) {
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("categories")
    .select(CATEGORY_COLUMNS)
    .eq("slug", normalizedSlug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to query category by slug: ${error.message}`);
  }

  return data;
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const normalizedName = normalizeName(input.name);

  if (!normalizedName) {
    throw new Error("Category name cannot be empty.");
  }

  const normalizedSlug = toCategorySlug(input, normalizedName);

  if (!normalizedSlug) {
    throw new Error("Category slug cannot be empty.");
  }

  const existing = await getCategoryBySlug(normalizedSlug);

  if (existing) {
    return existing;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("categories")
    .insert({
      name: normalizedName,
      slug: normalizedSlug,
    })
    .select(CATEGORY_COLUMNS)
    .single();

  if (!error) {
    return data;
  }

  // Unique conflicts can happen under concurrent requests; fetch existing row as fallback.
  if (error.code === "23505") {
    const conflicted = await getCategoryBySlug(normalizedSlug);

    if (conflicted) {
      return conflicted;
    }
  }

  throw new Error(`Failed to create category: ${error.message}`);
}
