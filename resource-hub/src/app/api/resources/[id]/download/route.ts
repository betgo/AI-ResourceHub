import { apiError, apiSuccess } from "@/lib/api/response";
import { createDownload } from "@/lib/db/downloads";
import { getResourceById } from "@/lib/db/resources";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeId(value: string) {
  return value.trim();
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
      message: "Downloads are only available for published resources.",
    });
  }

  return null;
}

export async function POST(_: Request, context: RouteContext) {
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
      message: "You must sign in before recording downloads.",
    });
  }

  try {
    const guardError = await requirePublishedResource(resourceId);

    if (guardError) {
      return guardError;
    }

    const download = await createDownload({
      resourceId,
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
