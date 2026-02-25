import { apiError, apiSuccess } from "@/lib/api/response";
import { isAdminUser } from "@/lib/auth/admin";
import {
  createResource,
  deleteResource,
  listResources,
  type ListResourcesParams,
  replaceResourceTags,
  type ResourceSortBy,
} from "@/lib/db/resources";
import { createTags } from "@/lib/db/tags";
import { createClient } from "@/lib/supabase/server";
import {
  createResourceBodySchema,
  getZodErrorDetails,
  getZodErrorMessage,
} from "@/lib/validation/schemas";
import type { Database } from "@/types/database";

export const runtime = "nodejs";

type ResourceStatus = Database["public"]["Enums"]["resource_status"];

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
    const userIsAdmin = user ? isAdminUser(user) : false;
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

      if (!ownerId && !userIsAdmin) {
        listParams.ownerId = user.id;
      }
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

      if (ownerId !== user.id && !userIsAdmin) {
        return apiError(403, {
          code: "FORBIDDEN",
          message: "You can only query your own resources unless you are an administrator.",
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

  const payloadResult = createResourceBodySchema.safeParse(body);

  if (!payloadResult.success) {
    return apiError(400, {
      code: "INVALID_REQUEST_BODY",
      message: getZodErrorMessage(payloadResult.error),
      details: getZodErrorDetails(payloadResult.error),
    });
  }

  const payload = payloadResult.data;

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

    try {
      if (payload.tags.length > 0) {
        const tags = await createTags(payload.tags);
        await replaceResourceTags(
          resource.id,
          tags.map((tag) => tag.id),
        );
      }
    } catch (tagError) {
      await deleteResource(resource.id, user.id).catch(() => null);
      throw tagError;
    }

    return apiSuccess(201, resource);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown resource create error.";
    return apiError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message,
    });
  }
}
