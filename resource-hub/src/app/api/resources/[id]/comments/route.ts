import { apiError, apiSuccess } from "@/lib/api/response";
import { createComment, listCommentsByResource } from "@/lib/db/comments";
import { getResourceById } from "@/lib/db/resources";
import { createClient } from "@/lib/supabase/server";
import {
  createCommentBodySchema,
  getZodErrorDetails,
  getZodErrorMessage,
  resourceIdParamSchema,
} from "@/lib/validation/schemas";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

async function getResourceId(context: RouteContext) {
  const params = await context.params;
  const parsed = resourceIdParamSchema.safeParse(params);

  if (!parsed.success) {
    return {
      id: null,
      error: parsed.error,
    };
  }

  return {
    id: parsed.data.id,
    error: null,
  };
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
  const resourceIdResult = await getResourceId(context);

  if (!resourceIdResult.id) {
    return apiError(400, {
      code: "INVALID_RESOURCE_ID",
      message: resourceIdResult.error
        ? getZodErrorMessage(resourceIdResult.error)
        : "Resource id is required.",
      details: resourceIdResult.error ? getZodErrorDetails(resourceIdResult.error) : undefined,
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
    const guardError = await requirePublishedResource(resourceIdResult.id);

    if (guardError) {
      return guardError;
    }

    const result = await listCommentsByResource({
      resourceId: resourceIdResult.id,
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
  const resourceIdResult = await getResourceId(context);

  if (!resourceIdResult.id) {
    return apiError(400, {
      code: "INVALID_RESOURCE_ID",
      message: resourceIdResult.error
        ? getZodErrorMessage(resourceIdResult.error)
        : "Resource id is required.",
      details: resourceIdResult.error ? getZodErrorDetails(resourceIdResult.error) : undefined,
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

  const payloadResult = createCommentBodySchema.safeParse(body);

  if (!payloadResult.success) {
    return apiError(400, {
      code: "INVALID_REQUEST_BODY",
      message: getZodErrorMessage(payloadResult.error),
      details: getZodErrorDetails(payloadResult.error),
    });
  }

  const payload = payloadResult.data;

  try {
    const guardError = await requirePublishedResource(resourceIdResult.id);

    if (guardError) {
      return guardError;
    }

    const comment = await createComment({
      resourceId: resourceIdResult.id,
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
