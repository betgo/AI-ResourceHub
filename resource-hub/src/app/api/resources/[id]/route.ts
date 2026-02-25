import { apiError, apiSuccess } from "@/lib/api/response";
import { isAdminUser } from "@/lib/auth/admin";
import { deleteResource, getResourceById, updateResource } from "@/lib/db/resources";
import { createClient } from "@/lib/supabase/server";
import {
  getZodErrorDetails,
  getZodErrorMessage,
  resourceIdParamSchema,
  updateResourceBodySchema,
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

export async function GET(_: Request, context: RouteContext) {
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

  try {
    const resource = await getResourceById(resourceIdResult.id);

    if (!resource) {
      return apiError(404, {
        code: "RESOURCE_NOT_FOUND",
        message: "Resource not found.",
      });
    }

    if (resource.status !== "published") {
      const user = await requireUser();

      if (!user || (user.id !== resource.owner_id && !isAdminUser(user))) {
        return apiError(403, {
          code: "FORBIDDEN",
          message: "You do not have access to this resource.",
        });
      }
    }

    return apiSuccess(200, resource);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown resource query error.";
    return apiError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message,
    });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
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
      message: "You must sign in before updating resources.",
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

  const payloadResult = updateResourceBodySchema.safeParse(body);

  if (!payloadResult.success) {
    return apiError(400, {
      code: "INVALID_REQUEST_BODY",
      message: getZodErrorMessage(payloadResult.error),
      details: getZodErrorDetails(payloadResult.error),
    });
  }

  const payload = payloadResult.data;

  try {
    const existing = await getResourceById(resourceIdResult.id);

    if (!existing) {
      return apiError(404, {
        code: "RESOURCE_NOT_FOUND",
        message: "Resource not found.",
      });
    }

    const ownedByCurrentUser = existing.owner_id === user.id;
    const canManage = ownedByCurrentUser || isAdminUser(user);

    if (!canManage) {
      return apiError(403, {
        code: "FORBIDDEN",
        message: "You can only update your own resources unless you are an administrator.",
      });
    }

    const updated = await updateResource({
      id: resourceIdResult.id,
      ownerId: ownedByCurrentUser ? user.id : undefined,
      categoryId: payload.categoryId,
      title: payload.title,
      description: payload.description,
      fileUrl: payload.fileUrl,
      coverUrl: payload.coverUrl,
    });

    if (!updated) {
      return apiError(404, {
        code: "RESOURCE_NOT_FOUND",
        message: "Resource not found.",
      });
    }

    return apiSuccess(200, updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown resource update error.";
    return apiError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message,
    });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
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
      message: "You must sign in before deleting resources.",
    });
  }

  try {
    const existing = await getResourceById(resourceIdResult.id);

    if (!existing) {
      return apiError(404, {
        code: "RESOURCE_NOT_FOUND",
        message: "Resource not found.",
      });
    }

    const ownedByCurrentUser = existing.owner_id === user.id;
    const canManage = ownedByCurrentUser || isAdminUser(user);

    if (!canManage) {
      return apiError(403, {
        code: "FORBIDDEN",
        message: "You can only delete your own resources unless you are an administrator.",
      });
    }

    const deleted = await deleteResource(resourceIdResult.id, ownedByCurrentUser ? user.id : undefined);

    if (!deleted) {
      return apiError(404, {
        code: "RESOURCE_NOT_FOUND",
        message: "Resource not found.",
      });
    }

    return apiSuccess(200, {
      id: resourceIdResult.id,
      deleted: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown resource delete error.";
    return apiError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message,
    });
  }
}
