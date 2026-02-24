import { apiError, apiSuccess } from "@/lib/api/response";
import { createComment, listCommentsByResource } from "@/lib/db/comments";
import { getResourceById } from "@/lib/db/resources";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type CreateCommentBody = {
  content: string;
};

function normalizeId(value: string) {
  return value.trim();
}

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

function parseCreateBody(input: unknown): { value: CreateCommentBody | null; error: string | null } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      value: null,
      error: "Request body must be a JSON object.",
    };
  }

  const body = input as Record<string, unknown>;

  if (typeof body.content !== "string" || !body.content.trim()) {
    return {
      value: null,
      error: "content is required and must be a non-empty string.",
    };
  }

  return {
    value: {
      content: body.content.trim(),
    },
    error: null,
  };
}

async function getResourceId(context: RouteContext) {
  const params = await context.params;
  return normalizeId(params.id ?? "");
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  return user;
}

async function requirePublishedResource(resourceId: string) {
  const resource = await getResourceById(resourceId);

  if (!resource) {
    return apiError(404, {
      code: "RESOURCE_NOT_FOUND",
      message: "Resource not found.",
    });
  }

  if (resource.status !== "published") {
    return apiError(403, {
      code: "RESOURCE_NOT_PUBLISHED",
      message: "Comments are only available for published resources.",
    });
  }

  return null;
}

export async function GET(request: Request, context: RouteContext) {
  const resourceId = await getResourceId(context);

  if (!resourceId) {
    return apiError(400, {
      code: "INVALID_RESOURCE_ID",
      message: "Resource id is required.",
    });
  }

  const url = new URL(request.url);
  const page = parsePositiveInt(url.searchParams.get("page"));
  const pageSize = parsePositiveInt(url.searchParams.get("pageSize"));

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

  try {
    const guardError = await requirePublishedResource(resourceId);

    if (guardError) {
      return guardError;
    }

    const result = await listCommentsByResource({
      resourceId,
      page: page ?? undefined,
      pageSize: pageSize ?? undefined,
    });

    return apiSuccess(200, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown comment list error.";
    return apiError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message,
    });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const resourceId = await getResourceId(context);

  if (!resourceId) {
    return apiError(400, {
      code: "INVALID_RESOURCE_ID",
      message: "Resource id is required.",
    });
  }

  const user = await requireUser();

  if (!user) {
    return apiError(401, {
      code: "UNAUTHORIZED",
      message: "You must sign in before creating comments.",
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
    const guardError = await requirePublishedResource(resourceId);

    if (guardError) {
      return guardError;
    }

    const comment = await createComment({
      resourceId,
      userId: user.id,
      content: payload.content,
    });

    return apiSuccess(201, comment);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown comment create error.";
    return apiError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message,
    });
  }
}
