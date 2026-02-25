import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminReviewPanel, type PendingReviewResource } from "@/components/admin/admin-review-panel";
import { Container } from "@/components/layout/container";
import { requireAdminUser } from "@/lib/auth/admin";
import { listCategories } from "@/lib/db/categories";
import { listResources } from "@/lib/db/resources";

export const dynamic = "force-dynamic";

type CategoryOption = {
  id: string;
  name: string;
};

async function loadPageData() {
  const [pendingResourcesResult, categoriesResult] = await Promise.allSettled([
    listResources({
      page: 1,
      pageSize: 100,
      status: "pending",
      sortBy: "latest",
    }),
    listCategories(),
  ]);

  const pendingResources: PendingReviewResource[] =
    pendingResourcesResult.status === "fulfilled"
      ? pendingResourcesResult.value.items.map((resource) => ({
          id: resource.id,
          title: resource.title,
          description: resource.description,
          ownerId: resource.owner_id,
          categoryId: resource.category_id,
          favoriteCount: resource.favorite_count,
          downloadCount: resource.download_count,
          createdAt: resource.created_at,
        }))
      : [];
  const categories: CategoryOption[] =
    categoriesResult.status === "fulfilled"
      ? categoriesResult.value.map((category) => ({
          id: category.id,
          name: category.name,
        }))
      : [];
  const loadWarnings: string[] = [];

  if (pendingResourcesResult.status === "rejected") {
    loadWarnings.push("Failed to load pending resources.");
  }

  if (categoriesResult.status === "rejected") {
    loadWarnings.push("Failed to load category metadata.");
  }

  return {
    pendingResources,
    categories,
    loadWarnings,
  };
}

export default async function AdminReviewPage() {
  const adminUser = await requireAdminUser();

  if (adminUser.error?.status === 401) {
    redirect("/login?next=%2Fadmin%2Freview");
  }

  if (adminUser.error?.status === 403) {
    return (
      <div className="py-10 sm:py-14">
        <Container className="max-w-3xl space-y-6">
          <section className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Review Center
            </h1>
            <p className="text-sm leading-6 text-[var(--text-muted)] sm:text-base">
              You are signed in, but administrator permissions are required to review resources.
            </p>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            Access denied. Please switch to an admin account or contact the system owner.
          </section>

          <Link
            href="/dashboard"
            className="inline-flex rounded-full bg-[var(--brand)] px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Back to dashboard
          </Link>
        </Container>
      </div>
    );
  }

  const { pendingResources, categories, loadWarnings } = await loadPageData();

  return (
    <div className="py-10 sm:py-14">
      <Container className="space-y-6">
        <section className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Admin Review Queue
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">
            Moderate pending resources with approve/reject decisions and keep the queue updated in
            real time after each review.
          </p>
        </section>

        {loadWarnings.length > 0 ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {loadWarnings.join(" ")}
          </section>
        ) : null}

        <AdminReviewPanel initialResources={pendingResources} categories={categories} />
      </Container>
    </div>
  );
}
