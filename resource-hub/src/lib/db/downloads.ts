import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type Download = Database["public"]["Tables"]["downloads"]["Row"];
type DownloadInsert = Database["public"]["Tables"]["downloads"]["Insert"];

const DOWNLOAD_COLUMNS = "id, user_id, resource_id, ip_hash, created_at";
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export type CreateDownloadInput = {
  resourceId: string;
  userId?: string | null;
  ipHash?: string | null;
};

export type ListDownloadsByUserParams = {
  userId: string;
  page?: number;
  pageSize?: number;
};

export type ListDownloadsByResourceParams = {
  resourceId: string;
  page?: number;
  pageSize?: number;
};

export type ListDownloadsResult = {
  items: Download[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function normalizeId(value: string): string {
  return value.trim();
}

function normalizeIpHash(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
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

async function countDownloadsByResource(resourceId: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("downloads")
    .select("*", { count: "exact", head: true })
    .eq("resource_id", resourceId);

  if (error) {
    throw new Error(`Failed to count downloads: ${error.message}`);
  }

  return count ?? 0;
}

export async function syncResourceDownloadCount(resourceId: string): Promise<number> {
  const normalizedResourceId = normalizeId(resourceId);

  if (!normalizedResourceId) {
    throw new Error("resourceId is required.");
  }

  const count = await countDownloadsByResource(normalizedResourceId);
  const admin = createAdminClient();
  const { error } = await admin
    .from("resources")
    .update({ download_count: count })
    .eq("id", normalizedResourceId);

  if (error) {
    throw new Error(`Failed to write download count: ${error.message}`);
  }

  return count;
}

export async function createDownload(input: CreateDownloadInput): Promise<Download> {
  const resourceId = normalizeId(input.resourceId);
  const userId = input.userId ? normalizeId(input.userId) : null;
  const ipHash = normalizeIpHash(input.ipHash);

  if (!resourceId) {
    throw new Error("resourceId is required.");
  }

  const payload: DownloadInsert = {
    resource_id: resourceId,
    user_id: userId,
    ip_hash: ipHash,
  };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("downloads")
    .insert(payload)
    .select(DOWNLOAD_COLUMNS)
    .single();

  if (error) {
    throw new Error(`Failed to create download record: ${error.message}`);
  }

  await syncResourceDownloadCount(resourceId);

  return data as Download;
}

export async function listDownloadsByUser(
  params: ListDownloadsByUserParams,
): Promise<ListDownloadsResult> {
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
    .from("downloads")
    .select(DOWNLOAD_COLUMNS, { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`Failed to list downloads by user: ${error.message}`);
  }

  const total = count ?? 0;

  return {
    items: (data ?? []) as Download[],
    total,
    page,
    pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}

export async function listDownloadsByResource(
  params: ListDownloadsByResourceParams,
): Promise<ListDownloadsResult> {
  const resourceId = normalizeId(params.resourceId);
  const page = normalizePage(params.page);
  const pageSize = normalizePageSize(params.pageSize);

  if (!resourceId) {
    throw new Error("resourceId is required.");
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const admin = createAdminClient();
  const { data, error, count } = await admin
    .from("downloads")
    .select(DOWNLOAD_COLUMNS, { count: "exact" })
    .eq("resource_id", resourceId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`Failed to list downloads by resource: ${error.message}`);
  }

  const total = count ?? 0;

  return {
    items: (data ?? []) as Download[],
    total,
    page,
    pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}
