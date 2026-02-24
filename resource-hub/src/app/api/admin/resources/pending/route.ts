import { apiError, apiSuccess } from "@/lib/api/response";
import { listResources } from "@/lib/db/resources";
import { requireAdminUser } from "@/lib/auth/admin";

export const runtime = "nodejs";

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

export async function GET(request: Request) {
  const adminUser = await requireAdminUser();

  if (adminUser.error) {
    return apiError(adminUser.error.status, {
      code: adminUser.error.code,
      message: adminUser.error.message,
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
    const result = await listResources({
      page,
      pageSize,
      status: "pending",
      sortBy: "latest",
    });

    return apiSuccess(200, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown pending resource list error.";
    return apiError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message,
    });
  }
}
