import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type Comment = Database["public"]["Tables"]["comments"]["Row"];
type CommentInsert = Database["public"]["Tables"]["comments"]["Insert"];
type CommentUpdate = Database["public"]["Tables"]["comments"]["Update"];

const COMMENT_COLUMNS = "id, resource_id, user_id, content, created_at, updated_at";
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export type CreateCommentInput = {
  resourceId: string;
  userId: string;
  content: string;
};

export type UpdateCommentInput = {
  id: string;
  userId?: string;
  content: string;
};

export type ListCommentsParams = {
  resourceId: string;
  page?: number;
  pageSize?: number;
};

export type ListCommentsResult = {
  items: Comment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function normalizeId(value: string): string {
  return value.trim();
}

function normalizeContent(value: string): string {
  return value.trim().replace(/\s+/g, " ");
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

export async function getCommentById(commentId: string): Promise<Comment | null> {
  const normalizedId = normalizeId(commentId);

  if (!normalizedId) {
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("comments")
    .select(COMMENT_COLUMNS)
    .eq("id", normalizedId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get comment by id: ${error.message}`);
  }

  return data as Comment | null;
}

export async function listCommentsByResource(params: ListCommentsParams): Promise<ListCommentsResult> {
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
    .from("comments")
    .select(COMMENT_COLUMNS, { count: "exact" })
    .eq("resource_id", resourceId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`Failed to list comments: ${error.message}`);
  }

  const total = count ?? 0;

  return {
    items: (data ?? []) as Comment[],
    total,
    page,
    pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}

export async function createComment(input: CreateCommentInput): Promise<Comment> {
  const resourceId = normalizeId(input.resourceId);
  const userId = normalizeId(input.userId);
  const content = normalizeContent(input.content);

  if (!resourceId) {
    throw new Error("resourceId is required.");
  }

  if (!userId) {
    throw new Error("userId is required.");
  }

  if (!content) {
    throw new Error("content cannot be empty.");
  }

  const payload: CommentInsert = {
    resource_id: resourceId,
    user_id: userId,
    content,
  };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("comments")
    .insert(payload)
    .select(COMMENT_COLUMNS)
    .single();

  if (error) {
    throw new Error(`Failed to create comment: ${error.message}`);
  }

  return data as Comment;
}

export async function updateComment(input: UpdateCommentInput): Promise<Comment | null> {
  const commentId = normalizeId(input.id);
  const content = normalizeContent(input.content);
  const userId = input.userId ? normalizeId(input.userId) : undefined;

  if (!commentId) {
    throw new Error("id is required.");
  }

  if (!content) {
    throw new Error("content cannot be empty.");
  }

  const patch: CommentUpdate = {
    content,
  };

  const admin = createAdminClient();
  let query = admin.from("comments").update(patch).eq("id", commentId);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.select(COMMENT_COLUMNS).maybeSingle();

  if (error) {
    throw new Error(`Failed to update comment: ${error.message}`);
  }

  return data as Comment | null;
}

export async function deleteComment(commentId: string, userId?: string): Promise<boolean> {
  const normalizedCommentId = normalizeId(commentId);
  const normalizedUserId = userId ? normalizeId(userId) : undefined;

  if (!normalizedCommentId) {
    throw new Error("commentId is required.");
  }

  const admin = createAdminClient();
  let query = admin.from("comments").delete().eq("id", normalizedCommentId);

  if (normalizedUserId) {
    query = query.eq("user_id", normalizedUserId);
  }

  const { data, error } = await query.select("id").maybeSingle();

  if (error) {
    throw new Error(`Failed to delete comment: ${error.message}`);
  }

  return Boolean(data);
}
