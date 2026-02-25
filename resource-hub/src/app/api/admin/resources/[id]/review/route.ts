import { apiError, apiSuccess } from "@/lib/api/response";
import { getResourceById, updateResourceStatus } from "@/lib/db/resources";
import { requireAdminUser } from "@/lib/auth/admin";
import {
  getZodErrorDetails,
  getZodErrorMessage,
  resourceIdParamSchema,
  reviewBodySchema,
} from "@/lib/validation/schemas";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

  const payloadResult = reviewBodySchema.safeParse(body);

  if (!payloadResult.success) {
    return apiError(400, {
      code: "INVALID_REQUEST_BODY",
      message: getZodErrorMessage(payloadResult.error),
      details: getZodErrorDetails(payloadResult.error),
    });
  }

  const payload = payloadResult.data;

  try {
    const resource = await getResourceById(resourceIdResult.id);

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
        ? await updateResourceStatus(resourceIdResult.id, "published")
        : await updateResourceStatus(resourceIdResult.id, "rejected", payload.reason);

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
