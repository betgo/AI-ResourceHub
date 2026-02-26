import { Container } from "@/components/layout/container";
import { SubmitResourceForm } from "@/components/resources/submit-resource-form";
import { listCategories } from "@/lib/db/categories";
import { listTags } from "@/lib/db/tags";

export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  const [categoriesResult, tagsResult] = await Promise.allSettled([
    listCategories(),
    listTags(24),
  ]);

  const categories =
    categoriesResult.status === "fulfilled"
      ? categoriesResult.value.map((category) => ({
          id: category.id,
          name: category.name,
        }))
      : [];
  const suggestedTags =
    tagsResult.status === "fulfilled"
      ? tagsResult.value.map((tag) => ({
          id: tag.id,
          name: tag.name,
        }))
      : [];

  return (
    <div className="py-10 sm:py-14">
      <Container className="space-y-6">
        <section className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Publish a Resource
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">
            Share useful files with the community. After submission, your resource enters
            the pending queue and becomes visible once approved by an admin.
          </p>
        </section>

        {(categoriesResult.status === "rejected" || tagsResult.status === "rejected") && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Some metadata failed to load. You can still submit, but category or tag
            suggestions might be incomplete.
          </section>
        )}

        <SubmitResourceForm categories={categories} suggestedTags={suggestedTags} />
      </Container>
    </div>
  );
}
