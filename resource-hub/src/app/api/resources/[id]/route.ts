import { apiError, apiSuccess } from "@/lib/api/response";
import { deleteResource, getResourceById, updateResource } from "@/lib/db/resources";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateResourceBody = {
  categoryId?: string | null;
  title?: string;
  description?: string;
  fileUrl?: string;
  coverUrl?: string | null;
};

function normalizeId(value: string) {
  return value.trim();
}

function parseUpdateBody(input: unknown): { value: UpdateResourceBody | null; error: string | null } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      value: null,
      error: "Request body must be a JSON object.",
    };
  }

  const body = input as Record<string, unknown>;
  const payload: UpdateResourceBody = {};

  if (body.categoryId !== undefined) {
    if (body.categoryId !== null && typeof body.categoryId !== "string") {
      return {
        value: null,
        error: "categoryId must be a string or null.",
      };
    }

    payload.categoryId = typeof body.categoryId === "string" ? body.categoryId.trim() : null;
  }

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return {
        value: null,
        error: "title must be a non-empty string.",
      };
    }

    payload.title = body.title.trim();
  }

  if (body.description !== undefined) {
    if (typeof body.description !== "string" || !body.description.trim()) {
      return {
        value: null,
        error: "description must be a non-empty string.",
      };
    }

    payload.description = body.description.trim();
  }

  if (body.fileUrl !== undefined) {
    if (typeof body.fileUrl !== "string" || !body.fileUrl.trim()) {
      return {
        value: null,
        error: "fileUrl must be a non-empty string.",
      };
    }

    payload.fileUrl = body.fileUrl.trim();
  }

  if (body.coverUrl !== undefined) {
    if (body.coverUrl !== null && typeof body.coverUrl !== "string") {
      return {
        value: null,
        error: "coverUrl must be a string or null.",
      };
    }

    payload.coverUrl = typeof body.coverUrl === "string" ? body.coverUrl.trim() : null;
  }

  if (Object.keys(payload).length === 0) {
    return {
      value: null,
      error: "At least one updatable field is required.",
    };
  }

  return {
    value: payload,
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

export async function GET(_: Request, context: RouteContext) {
  const resourceId = await getResourceId(context);

  if (!resourceId) {
    return apiError(400, {
      code: "INVALID_RESOURCE_ID",
      message: "Resource id is required.",
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

    if (resource.status !== "published") {
      const user = await requireUser();

      if (!user || user.id !== resource.owner_id) {
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

  const { value: payload, error } = parseUpdateBody(body);

  if (error || !payload) {
    return apiError(400, {
      code: "INVALID_REQUEST_BODY",
      message: error ?? "Invalid request body.",
    });
  }

  try {
    const existing = await getResourceById(resourceId);

    if (!existing) {
      return apiError(404, {
        code: "RESOURCE_NOT_FOUND",
        message: "Resource not found.",
      });
    }

    if (existing.owner_id !== user.id) {
      return apiError(403, {
        code: "FORBIDDEN",
        message: "You can only update your own resources.",
      });
    }

    const updated = await updateResource({
      id: resourceId,
      ownerId: user.id,
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
      message: "You must sign in before deleting resources.",
    });
  }

  try {
    const deleted = await deleteResource(resourceId, user.id);

    if (!deleted) {
      return apiError(404, {
        code: "RESOURCE_NOT_FOUND",
        message: "Resource not found.",
      });
    }

    return apiSuccess(200, {
      id: resourceId,
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
