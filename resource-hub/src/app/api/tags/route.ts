import { unstable_cache } from "next/cache";

import { apiError, apiSuccess } from "@/lib/api/response";
import { listTags, searchTags } from "@/lib/db/tags";

export const runtime = "nodejs";

const TAG_CACHE_SECONDS = 60;

const listOrSearchTagsCached = unstable_cache(
  async (keyword: string, limit: number | null) => {
    if (keyword) {
      return searchTags(keyword, limit ?? undefined);
    }

    return listTags(limit ?? undefined);
  },
  ["api-tags-list"],
  {
    revalidate: TAG_CACHE_SECONDS,
    tags: ["tags"],
  },
);

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

function normalizeKeyword(value: string | null) {
  if (!value) {
    return "";
  }

  return value.trim();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = parsePositiveInt(url.searchParams.get("limit"));

  if (limit === null) {
    return apiError(400, {
      code: "INVALID_LIMIT",
      message: "limit must be a positive integer.",
    });
  }

  const keyword = normalizeKeyword(url.searchParams.get("keyword"));

  try {
    const tags = await listOrSearchTagsCached(keyword, limit ?? null);
    return apiSuccess(200, tags);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown tag list error.";

    return apiError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message,
    });
  }
}
