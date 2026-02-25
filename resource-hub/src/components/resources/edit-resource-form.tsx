"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type CategoryOption = {
  id: string;
  name: string;
};

type EditResourceFormProps = {
  resourceId: string;
  categories: CategoryOption[];
  initialValue: {
    title: string;
    description: string;
    categoryId: string | null;
    fileUrl: string;
    coverUrl: string | null;
  };
};

type ApiErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
  };
};

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

async function parseApiErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as ApiErrorEnvelope;
    return payload.error?.message || fallback;
  } catch {
    return fallback;
  }
}

export function EditResourceForm({
  resourceId,
  categories,
  initialValue,
}: EditResourceFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialValue.title);
  const [description, setDescription] = useState(initialValue.description);
  const [categoryId, setCategoryId] = useState(initialValue.categoryId ?? "");
  const [fileUrl, setFileUrl] = useState(initialValue.fileUrl);
  const [coverUrl, setCoverUrl] = useState(initialValue.coverUrl ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const hasChanges = useMemo(() => {
    return (
      normalizeText(title) !== initialValue.title ||
      normalizeText(description) !== initialValue.description ||
      categoryId !== (initialValue.categoryId ?? "") ||
      fileUrl.trim() !== initialValue.fileUrl ||
      coverUrl.trim() !== (initialValue.coverUrl ?? "")
    );
  }, [categoryId, coverUrl, description, fileUrl, initialValue, title]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedTitle = normalizeText(title);
    const normalizedDescription = normalizeText(description);
    const normalizedFileUrl = fileUrl.trim();
    const normalizedCoverUrl = coverUrl.trim();

    if (!normalizedTitle) {
      setSubmitError("Title is required.");
      return;
    }

    if (!normalizedDescription) {
      setSubmitError("Description is required.");
      return;
    }

    if (!normalizedFileUrl) {
      setSubmitError("File URL is required.");
      return;
    }

    const payload: {
      title?: string;
      description?: string;
      categoryId?: string | null;
      fileUrl?: string;
      coverUrl?: string | null;
    } = {};

    if (normalizedTitle !== initialValue.title) {
      payload.title = normalizedTitle;
    }

    if (normalizedDescription !== initialValue.description) {
      payload.description = normalizedDescription;
    }

    if (categoryId !== (initialValue.categoryId ?? "")) {
      payload.categoryId = categoryId || null;
    }

    if (normalizedFileUrl !== initialValue.fileUrl) {
      payload.fileUrl = normalizedFileUrl;
    }

    if (normalizedCoverUrl !== (initialValue.coverUrl ?? "")) {
      payload.coverUrl = normalizedCoverUrl || null;
    }

    if (Object.keys(payload).length === 0) {
      setSubmitError("No changes to save.");
      return;
    }

    setSubmitError(null);
    setSubmitSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/resources/${resourceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorMessage = await parseApiErrorMessage(response, "Failed to update the resource.");
        throw new Error(errorMessage);
      }

      setSubmitSuccess("Resource updated successfully.");
      router.refresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown update error.";
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-[var(--stroke-soft)] bg-white p-6 shadow-sm"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Title</span>
          <input
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            required
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Description</span>
          <textarea
            name="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={6}
            maxLength={2000}
            required
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Category</span>
          <select
            name="categoryId"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Uncategorized</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Cover URL (optional)</span>
          <input
            name="coverUrl"
            type="url"
            value={coverUrl}
            onChange={(event) => setCoverUrl(event.target.value)}
            placeholder="https://..."
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">File URL</span>
          <input
            name="fileUrl"
            type="url"
            value={fileUrl}
            onChange={(event) => setFileUrl(event.target.value)}
            required
            placeholder="https://..."
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>

      {submitError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {submitError}
        </div>
      ) : null}

      {submitSuccess ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {submitSuccess}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!hasChanges || isSubmitting}
          className="rounded-full bg-[var(--brand)] px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : "Save changes"}
        </button>
        <Link
          href="/dashboard"
          className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400"
        >
          Back to dashboard
        </Link>
      </div>
    </form>
  );
}
