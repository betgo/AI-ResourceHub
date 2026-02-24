import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type Favorite = Database["public"]["Tables"]["favorites"]["Row"];
type FavoriteInsert = Database["public"]["Tables"]["favorites"]["Insert"];

const FAVORITE_COLUMNS = "user_id, resource_id, created_at";
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export type FavoriteInput = {
  userId: string;
  resourceId: string;
};

export type FavoriteMutationResult = {
  favorited: boolean;
  favoriteCount: number;
};

export type ListFavoritesParams = {
  userId: string;
  page?: number;
  pageSize?: number;
};

export type ListFavoritesResult = {
  items: Favorite[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

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

async function countFavoritesByResource(resourceId: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("favorites")
    .select("*", { count: "exact", head: true })
    .eq("resource_id", resourceId);

  if (error) {
    throw new Error(`Failed to count favorites: ${error.message}`);
  }

  return count ?? 0;
}

export async function syncResourceFavoriteCount(resourceId: string): Promise<number> {
  const normalizedResourceId = normalizeId(resourceId);

  if (!normalizedResourceId) {
    throw new Error("resourceId is required.");
  }

  const count = await countFavoritesByResource(normalizedResourceId);
  const admin = createAdminClient();
  const { error } = await admin
    .from("resources")
    .update({ favorite_count: count })
    .eq("id", normalizedResourceId);

  if (error) {
    throw new Error(`Failed to write favorite count: ${error.message}`);
  }

  return count;
}

export async function isResourceFavoritedByUser(input: FavoriteInput): Promise<boolean> {
  const userId = normalizeId(input.userId);
  const resourceId = normalizeId(input.resourceId);

  if (!userId || !resourceId) {
    return false;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("favorites")
    .select(FAVORITE_COLUMNS)
    .eq("user_id", userId)
    .eq("resource_id", resourceId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to query favorite state: ${error.message}`);
  }

  return Boolean(data);
}

export async function addFavorite(input: FavoriteInput): Promise<FavoriteMutationResult> {
  const userId = normalizeId(input.userId);
  const resourceId = normalizeId(input.resourceId);

  if (!userId) {
    throw new Error("userId is required.");
  }

  if (!resourceId) {
    throw new Error("resourceId is required.");
  }

  const payload: FavoriteInsert = {
    user_id: userId,
    resource_id: resourceId,
  };

  const admin = createAdminClient();
  const { error } = await admin.from("favorites").insert(payload);

  if (error && error.code !== "23505") {
    throw new Error(`Failed to add favorite: ${error.message}`);
  }

  const favoriteCount = await syncResourceFavoriteCount(resourceId);

  return {
    favorited: true,
    favoriteCount,
  };
}

export async function removeFavorite(input: FavoriteInput): Promise<FavoriteMutationResult> {
  const userId = normalizeId(input.userId);
  const resourceId = normalizeId(input.resourceId);

  if (!userId) {
    throw new Error("userId is required.");
  }

  if (!resourceId) {
    throw new Error("resourceId is required.");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("resource_id", resourceId);

  if (error) {
    throw new Error(`Failed to remove favorite: ${error.message}`);
  }

  const favoriteCount = await syncResourceFavoriteCount(resourceId);

  return {
    favorited: false,
    favoriteCount,
  };
}

export async function toggleFavorite(input: FavoriteInput): Promise<FavoriteMutationResult> {
  const favorited = await isResourceFavoritedByUser(input);

  if (favorited) {
    return removeFavorite(input);
  }

  return addFavorite(input);
}

export async function listFavoritesByUser(params: ListFavoritesParams): Promise<ListFavoritesResult> {
  const userId = normalizeId(params.userId);
  const page = normalizePage(params.page);
  const pageSize = normalizePageSize(params.pageSize);

  if (!userId) {
    throw new Error("userId is required.");
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const admin = createAdminClient();
  const { data, error, count } = await admin
    .from("favorites")
    .select(FAVORITE_COLUMNS, { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`Failed to list favorites: ${error.message}`);
  }

  const total = count ?? 0;

  return {
    items: (data ?? []) as Favorite[],
    total,
    page,
    pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}
