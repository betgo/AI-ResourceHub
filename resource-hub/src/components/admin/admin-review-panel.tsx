"use client";

import { useMemo, useState } from "react";

type CategoryOption = {
  id: string;
  name: string;
};

export type PendingReviewResource = {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  categoryId: string | null;
  favoriteCount: number;
  downloadCount: number;
  createdAt: string;
};

type ApiErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
  };
};

type PendingListEnvelope = {
  data?: {
    items?: Array<{
      id: string;
      title: string;
      description: string;
      owner_id: string;
      category_id: string | null;
      favorite_count: number;
      download_count: number;
      created_at: string;
    }>;
  };
};

type AdminReviewPanelProps = {
  initialResources: PendingReviewResource[];
  categories: CategoryOption[];
};

type ReviewAction = "approve" | "reject";

function summarizeText(input: string, maxLength: number) {
  if (input.length <= maxLength) {
    return input;
  }

  return `${input.slice(0, maxLength).trimEnd()}...`;
}

function formatDateLabel(value: string) {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function formatOwnerLabel(ownerId: string) {
  if (!ownerId) {
    return "Unknown owner";
  }

  return `User ${ownerId.slice(0, 8)}`;
}

function mapApiResource(input: {
  id: string;
  title: string;
  description: string;
  owner_id: string;
  category_id: string | null;
  favorite_count: number;
  download_count: number;
  created_at: string;
}): PendingReviewResource {
  return {
    id: input.id,
    title: input.title,
    description: input.description,
    ownerId: input.owner_id,
    categoryId: input.category_id,
    favoriteCount: input.favorite_count,
    downloadCount: input.download_count,
    createdAt: input.created_at,
  };
}

async function parseApiErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as ApiErrorEnvelope;
    return payload.error?.message || fallback;
  } catch {
    return fallback;
  }
}

export function AdminReviewPanel({ initialResources, categories }: AdminReviewPanelProps) {
  const [resources, setResources] = useState(initialResources);
  const [rejectReasonById, setRejectReasonById] = useState<Record<string, string>>({});
  const [errorById, setErrorById] = useState<Record<string, string>>({});
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [activeResourceId, setActiveResourceId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name] as const)),
    [categories],
  );

  const activeActionResource = useMemo(
    () => resources.find((resource) => resource.id === activeResourceId) ?? null,
    [activeResourceId, resources],
  );

  const removeKeyFromRecord = (source: Record<string, string>, key: string) => {
    const next = { ...source };
    delete next[key];
    return next;
  };

  const loadPendingResources = async () => {
    setFeedbackMessage(null);
    setIsRefreshing(true);

    try {
      const response = await fetch("/api/admin/resources/pending?page=1&pageSize=100", {
        method: "GET",
      });

      if (!response.ok) {
        const errorMessage = await parseApiErrorMessage(response, "Failed to refresh review queue.");
        setFeedbackMessage(errorMessage);
        return;
      }

      const payload = (await response.json()) as PendingListEnvelope;
      const nextItems = payload.data?.items?.map(mapApiResource) ?? [];

      setResources(nextItems);
      setFeedbackMessage("Review queue refreshed.");
    } catch {
      setFeedbackMessage("Network error while refreshing review queue.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleReasonChange = (resourceId: string, nextReason: string) => {
    setRejectReasonById((current) => ({
      ...current,
      [resourceId]: nextReason,
    }));
    setErrorById((current) => removeKeyFromRecord(current, resourceId));
    setFeedbackMessage(null);
  };

  const handleReviewAction = async (resource: PendingReviewResource, action: ReviewAction) => {
    setFeedbackMessage(null);
    const reason = rejectReasonById[resource.id]?.trim() ?? "";

    if (action === "reject" && !reason) {
      setErrorById((current) => ({
        ...current,
        [resource.id]: "Rejection reason is required.",
      }));
      return;
    }

    setActiveResourceId(resource.id);
    setErrorById((current) => removeKeyFromRecord(current, resource.id));

    try {
      const response = await fetch(`/api/admin/resources/${resource.id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          reason: action === "reject" ? reason : null,
        }),
      });

      if (!response.ok) {
        const errorMessage = await parseApiErrorMessage(response, "Failed to submit review action.");
        setErrorById((current) => ({
          ...current,
          [resource.id]: errorMessage,
        }));
        return;
      }

      setResources((current) => current.filter((item) => item.id !== resource.id));
      setRejectReasonById((current) => removeKeyFromRecord(current, resource.id));
      setFeedbackMessage(
        action === "approve"
          ? `Approved: ${resource.title}`
          : `Rejected: ${resource.title}`,
      );
    } catch {
      setErrorById((current) => ({
        ...current,
        [resource.id]: "Network error while submitting review action.",
      }));
    } finally {
      setActiveResourceId(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--stroke-soft)] bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Pending resources</h2>
          <p className="text-sm text-[var(--text-muted)]">
            {resources.length} item{resources.length === 1 ? "" : "s"} waiting for moderation.
          </p>
        </div>
        <button
          type="button"
          onClick={loadPendingResources}
          disabled={isRefreshing || activeResourceId !== null}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRefreshing ? "Refreshing..." : "Refresh queue"}
        </button>
      </div>

      {feedbackMessage ? (
        <p className="rounded-xl bg-blue-50 px-4 py-2 text-sm text-blue-800">{feedbackMessage}</p>
      ) : null}

      {resources.length === 0 ? (
        <article className="rounded-2xl border border-dashed border-[var(--stroke-soft)] bg-white p-8 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">All caught up</h3>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            No pending resources at the moment. New submissions will appear here automatically
            after refresh.
          </p>
        </article>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {resources.map((resource) => {
            const categoryLabel = resource.categoryId
              ? categoryNameById.get(resource.categoryId) ?? "Unknown category"
              : "Uncategorized";
            const cardError = errorById[resource.id];
            const rejectReason = rejectReasonById[resource.id] ?? "";
            const isSubmitting = activeResourceId === resource.id;

            return (
              <article
                key={resource.id}
                className="space-y-4 rounded-2xl border border-[var(--stroke-soft)] bg-white p-5 shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-slate-900">{resource.title}</h3>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      Pending
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-[var(--text-muted)]">
                    {summarizeText(resource.description, 180)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">{categoryLabel}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">
                    {formatOwnerLabel(resource.ownerId)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">
                    {resource.favoriteCount} favorites
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">
                    {resource.downloadCount} downloads
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">
                    Submitted {formatDateLabel(resource.createdAt)}
                  </span>
                </div>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">
                    Rejection reason (required for reject)
                  </span>
                  <textarea
                    value={rejectReason}
                    onChange={(event) => handleReasonChange(resource.id, event.target.value)}
                    rows={3}
                    maxLength={500}
                    disabled={isSubmitting}
                    placeholder="Explain what needs to be improved before resubmission..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </label>

                {cardError ? (
                  <p className="rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-700">{cardError}</p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleReviewAction(resource, "approve")}
                    disabled={activeResourceId !== null}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting && activeActionResource?.id === resource.id
                      ? "Submitting..."
                      : "Approve"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReviewAction(resource, "reject")}
                    disabled={activeResourceId !== null}
                    className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting && activeActionResource?.id === resource.id
                      ? "Submitting..."
                      : "Reject"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
