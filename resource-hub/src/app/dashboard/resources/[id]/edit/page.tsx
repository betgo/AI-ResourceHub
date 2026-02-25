import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Container } from "@/components/layout/container";
import { EditResourceForm } from "@/components/resources/edit-resource-form";
import { listCategories } from "@/lib/db/categories";
import { getResourceById } from "@/lib/db/resources";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeId(value: string) {
  return value.trim();
}

export default async function EditResourcePage({ params }: PageProps) {
  const resolvedParams = await params;
  const resourceId = normalizeId(resolvedParams.id ?? "");

  if (!resourceId) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/dashboard/resources/${resourceId}/edit`)}`);
  }

  let resource = null;

  try {
    resource = await getResourceById(resourceId);
  } catch {
    notFound();
  }

  if (!resource || resource.owner_id !== user.id) {
    notFound();
  }

  const categoriesResult = await Promise.allSettled([listCategories()]);
  const categories = categoriesResult[0].status === "fulfilled" ? categoriesResult[0].value : [];
  const loadCategoryFailed = categoriesResult[0].status === "rejected";

  return (
    <div className="py-10 sm:py-14">
      <Container className="space-y-6">
        <section className="space-y-2">
          <Link
            href="/dashboard"
            className="inline-flex text-sm font-semibold text-[var(--brand)] transition hover:text-blue-700"
          >
            ← Back to dashboard
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Edit Resource
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">
            Update your resource metadata. Changes are saved directly to your existing item.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--stroke-soft)] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
              ID: {resource.id.slice(0, 8)}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
              Status: {resource.status}
            </span>
          </div>
        </section>

        {loadCategoryFailed ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Category options are temporarily unavailable. You can still edit other fields.
          </section>
        ) : null}

        <EditResourceForm
          resourceId={resource.id}
          categories={categories.map((category) => ({
            id: category.id,
            name: category.name,
          }))}
          initialValue={{
            title: resource.title,
            description: resource.description,
            categoryId: resource.category_id,
            fileUrl: resource.file_url,
            coverUrl: resource.cover_url,
          }}
        />
      </Container>
    </div>
  );
}
