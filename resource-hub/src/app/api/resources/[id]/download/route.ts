import { apiError, apiSuccess } from "@/lib/api/response";
import { createDownload } from "@/lib/db/downloads";
import { getResourceById } from "@/lib/db/resources";
import { createClient } from "@/lib/supabase/server";
import {
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
      message: "Downloads are only available for published resources.",
    });
  }

  return null;
}

export async function POST(_: Request, context: RouteContext) {
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
      message: "You must sign in before recording downloads.",
    });
  }

  try {
    const guardError = await requirePublishedResource(resourceIdResult.id);

    if (guardError) {
      return guardError;
    }

    const download = await createDownload({
      resourceId: resourceIdResult.id,
      userId: user.id,
    });

    return apiSuccess(201, download);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown download create error.";
    return apiError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message,
    });
  }
}
