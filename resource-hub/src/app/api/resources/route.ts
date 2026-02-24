import { apiError, apiSuccess } from "@/lib/api/response";
import {
  createResource,
  listResources,
  type ListResourcesParams,
  type ResourceSortBy,
} from "@/lib/db/resources";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export const runtime = "nodejs";

type ResourceStatus = Database["public"]["Enums"]["resource_status"];
type CreateResourceBody = {
  categoryId?: string | null;
  title: string;
  description: string;
  fileUrl: string;
  coverUrl?: string | null;
};

const RESOURCE_SORT_VALUES: ResourceSortBy[] = ["latest", "hot", "downloads"];
const RESOURCE_STATUS_VALUES: ResourceStatus[] = ["pending", "published", "rejected"];

function parsePositiveInt(value: string | null) {
  if (value === null) {
    return undefined;
  }

  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return parsed > 0 ? parsed : null;
}

function parseSortBy(value: string | null): ResourceSortBy | null | undefined {
  if (!value) {
    return undefined;
  }

  if (!RESOURCE_SORT_VALUES.includes(value as ResourceSortBy)) {
    return null;
  }

  return value as ResourceSortBy;
}

function parseStatus(value: string | null): ResourceStatus | null | undefined {
  if (!value) {
    return undefined;
  }

  if (!RESOURCE_STATUS_VALUES.includes(value as ResourceStatus)) {
    return null;
  }

  return value as ResourceStatus;
}

function parseStringList(searchParams: URLSearchParams, key: string) {
  const values = searchParams
    .getAll(key)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set(values)];
}

function parseCreateBody(input: unknown): { value: CreateResourceBody | null; error: string | null } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      value: null,
      error: "Request body must be a JSON object.",
    };
  }

  const body = input as Record<string, unknown>;

  if (body.categoryId !== undefined && body.categoryId !== null && typeof body.categoryId !== "string") {
    return {
      value: null,
      error: "categoryId must be a string or null.",
    };
  }

  if (typeof body.title !== "string" || !body.title.trim()) {
    return {
      value: null,
      error: "title is required and must be a non-empty string.",
    };
  }

  if (typeof body.description !== "string" || !body.description.trim()) {
    return {
      value: null,
      error: "description is required and must be a non-empty string.",
    };
  }

  if (typeof body.fileUrl !== "string" || !body.fileUrl.trim()) {
    return {
      value: null,
      error: "fileUrl is required and must be a non-empty string.",
    };
  }

  if (body.coverUrl !== undefined && body.coverUrl !== null && typeof body.coverUrl !== "string") {
    return {
      value: null,
      error: "coverUrl must be a string or null.",
    };
  }

  const payload: CreateResourceBody = {
    categoryId: typeof body.categoryId === "string" ? body.categoryId.trim() : body.categoryId ?? undefined,
    title: body.title.trim(),
    description: body.description.trim(),
    fileUrl: body.fileUrl.trim(),
    coverUrl: typeof body.coverUrl === "string" ? body.coverUrl.trim() : body.coverUrl ?? undefined,
  };

  return {
    value: payload,
    error: null,
  };
}

async function getOptionalUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = parsePositiveInt(url.searchParams.get("page"));
  const pageSize = parsePositiveInt(url.searchParams.get("pageSize"));
  const sortBy = parseSortBy(url.searchParams.get("sortBy"));
  const status = parseStatus(url.searchParams.get("status"));
  const ownerId = url.searchParams.get("ownerId")?.trim() || undefined;

  if (page === null) {
    return apiError(400, {
      code: "INVALID_PAGE",
      message: "page must be a positive integer.",
    });
  }

  if (pageSize === null) {
    return apiError(400, {
      code: "INVALID_PAGE_SIZE",
      message: "pageSize must be a positive integer.",
    });
  }

  if (sortBy === null) {
    return apiError(400, {
      code: "INVALID_SORT_BY",
      message: "sortBy must be one of latest, hot, downloads.",
    });
  }

  if (status === null) {
    return apiError(400, {
      code: "INVALID_STATUS",
      message: "status must be one of pending, published, rejected.",
    });
  }

  try {
    const user = await getOptionalUser();
    const listParams: ListResourcesParams = {
      page,
      pageSize,
      keyword: url.searchParams.get("keyword")?.trim() || undefined,
      categoryId: url.searchParams.get("categoryId")?.trim() || undefined,
      tagIds: parseStringList(url.searchParams, "tagIds"),
      tagSlugs: parseStringList(url.searchParams, "tagSlugs"),
      sortBy,
      status: "published",
    };

    if (status && status !== "published") {
      if (!user) {
        return apiError(401, {
          code: "UNAUTHORIZED",
          message: "You must sign in to query non-published resources.",
        });
      }

      listParams.status = status;
    } else if (status === "published") {
      listParams.status = "published";
    }

    if (ownerId) {
      if (!user) {
        return apiError(401, {
          code: "UNAUTHORIZED",
          message: "You must sign in to query owner resources.",
        });
      }

      if (ownerId !== user.id) {
        return apiError(403, {
          code: "FORBIDDEN",
          message: "You can only query your own resources.",
        });
      }

      listParams.ownerId = ownerId;

      if (!status) {
        delete listParams.status;
      }
    }

    const result = await listResources(listParams);
    return apiSuccess(200, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown resource list error.";

    return apiError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message,
    });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return apiError(401, {
      code: "UNAUTHORIZED",
      message: "You must sign in before creating resources.",
    });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError(400, {
      code: "INVALID_JSON",
      message: "Request body must be valid JSON.",
    });
  }

  const { value: payload, error } = parseCreateBody(body);

  if (error || !payload) {
    return apiError(400, {
      code: "INVALID_REQUEST_BODY",
      message: error ?? "Invalid request body.",
    });
  }

  try {
    const resource = await createResource({
      ownerId: user.id,
      categoryId: payload.categoryId,
      title: payload.title,
      description: payload.description,
      fileUrl: payload.fileUrl,
      coverUrl: payload.coverUrl,
      status: "pending",
    });

    return apiSuccess(201, resource);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown resource create error.";
    return apiError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message,
    });
  }
}
