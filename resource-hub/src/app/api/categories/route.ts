import { unstable_cache } from "next/cache";

import { apiError, apiSuccess } from "@/lib/api/response";
import { listCategories } from "@/lib/db/categories";

export const runtime = "nodejs";

const CATEGORY_CACHE_SECONDS = 60;

const listCategoriesCached = unstable_cache(
  async () => listCategories(),
  ["api-categories-list"],
  {
    revalidate: CATEGORY_CACHE_SECONDS,
    tags: ["categories"],
  },
);

export async function GET() {
  try {
    const categories = await listCategoriesCached();
    return apiSuccess(200, categories);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown category list error.";

    return apiError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message,
    });
  }
}
