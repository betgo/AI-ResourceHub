import { apiError, apiSuccess } from "@/lib/api/response";
import { getResourceById, updateResourceStatus } from "@/lib/db/resources";
import { requireAdminUser } from "@/lib/auth/admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ReviewAction = "approve" | "reject";
type ReviewBody = {
  action: ReviewAction;
  reason: string | null;
};

function normalizeId(value: string) {
  return value.trim();
}

function parseReviewBody(input: unknown): { value: ReviewBody | null; error: string | null } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      value: null,
      error: "Request body must be a JSON object.",
    };
  }

  const body = input as Record<string, unknown>;

  if (body.action !== "approve" && body.action !== "reject") {
    return {
      value: null,
      error: "action must be one of approve or reject.",
    };
  }

  if (body.reason !== undefined && body.reason !== null && typeof body.reason !== "string") {
    return {
      value: null,
      error: "reason must be a string or null.",
    };
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : null;

  if (body.action === "reject" && !reason) {
    return {
      value: null,
      error: "reason is required when action is reject.",
    };
  }

  return {
    value: {
      action: body.action,
      reason,
    },
    error: null,
  };
}

async function getResourceId(context: RouteContext) {
  const params = await context.params;
  return normalizeId(params.id ?? "");
}

export async function POST(request: Request, context: RouteContext) {
  const resourceId = await getResourceId(context);

  if (!resourceId) {
    return apiError(400, {
      code: "INVALID_RESOURCE_ID",
      message: "Resource id is required.",
    });
  }

  const adminUser = await requireAdminUser();

  if (adminUser.error) {
    return apiError(adminUser.error.status, {
      code: adminUser.error.code,
      message: adminUser.error.message,
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

  const { value: payload, error } = parseReviewBody(body);

  if (error || !payload) {
    return apiError(400, {
      code: "INVALID_REQUEST_BODY",
      message: error ?? "Invalid request body.",
    });
  }

  try {
    const resource = await getResourceById(resourceId);

    if (!resource) {
      return apiError(404, {
        code: "RESOURCE_NOT_FOUND",
        message: "Resource not found.",
      });
    }

    if (resource.status !== "pending") {
      return apiError(409, {
        code: "RESOURCE_NOT_PENDING",
        message: "Only pending resources can be reviewed.",
      });
    }

    const reviewedResource =
      payload.action === "approve"
        ? await updateResourceStatus(resourceId, "published")
        : await updateResourceStatus(resourceId, "rejected", payload.reason);

    if (!reviewedResource) {
      return apiError(404, {
        code: "RESOURCE_NOT_FOUND",
        message: "Resource not found.",
      });
    }

    return apiSuccess(200, reviewedResource);
  } catch (reviewError) {
    const message =
      reviewError instanceof Error ? reviewError.message : "Unknown resource review error.";

    return apiError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message,
    });
  }
}
