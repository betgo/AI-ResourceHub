"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { AlertMessage } from "@/components/feedback/alert-message";
import { cn } from "@/lib/utils";

type CommentItem = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

type FavoriteMutationResult = {
  favorited: boolean;
  favoriteCount: number;
};

type ApiErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
  };
};

type ApiSuccessEnvelope<T> = {
  data?: T;
};

type ResourceDetailInteractionsProps = {
  resourceId: string;
  fileUrl: string;
  loginHref: string;
  canInteract: boolean;
  initialIsFavorited: boolean;
  initialFavoriteCount: number;
  initialDownloadCount: number;
  initialComments: CommentItem[];
  initialCommentTotal: number;
  initialCommentError?: string | null;
};

function formatDateTimeLabel(value: string) {
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

function formatUserLabel(userId: string) {
  if (!userId) {
    return "Anonymous";
  }

  return `User ${userId.slice(0, 8)}`;
}

async function parseApiErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as ApiErrorEnvelope;
    return payload.error?.message || fallback;
  } catch {
    return fallback;
  }
}

async function parseApiData<T>(response: Response) {
  const payload = (await response.json()) as ApiSuccessEnvelope<T>;
  return payload.data ?? null;
}

export function ResourceDetailInteractions({
  resourceId,
  fileUrl,
  loginHref,
  canInteract,
  initialIsFavorited,
  initialFavoriteCount,
  initialDownloadCount,
  initialComments,
  initialCommentTotal,
  initialCommentError,
}: ResourceDetailInteractionsProps) {
  const [favoriteCount, setFavoriteCount] = useState(initialFavoriteCount);
  const [downloadCount, setDownloadCount] = useState(initialDownloadCount);
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [comments, setComments] = useState(initialComments);
  const [commentTotal, setCommentTotal] = useState(initialCommentTotal);
  const [commentText, setCommentText] = useState("");
  const [isFavoriteSubmitting, setIsFavoriteSubmitting] = useState(false);
  const [isDownloadSubmitting, setIsDownloadSubmitting] = useState(false);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(initialCommentError ?? null);

  const interactionHint = useMemo(() => {
    if (canInteract) {
      return null;
    }

    return "Log in to favorite, download, and leave comments.";
  }, [canInteract]);

  const handleFavoriteClick = async () => {
    setActionError(null);

    if (!canInteract) {
      setActionError("Please log in before toggling favorites.");
      return;
    }

    setIsFavoriteSubmitting(true);

    try {
      const response = await fetch(`/api/resources/${resourceId}/favorite`, {
        method: "POST",
      });

      if (!response.ok) {
        const message = await parseApiErrorMessage(
          response,
          "Failed to toggle favorite state.",
        );
        setActionError(message);
        return;
      }

      const result = await parseApiData<FavoriteMutationResult>(response);

      if (!result) {
        setActionError("Favorite response is malformed.");
        return;
      }

      setIsFavorited(result.favorited);
      setFavoriteCount(result.favoriteCount);
    } catch {
      setActionError("Network error while toggling favorite.");
    } finally {
      setIsFavoriteSubmitting(false);
    }
  };

  const handleDownloadClick = async () => {
    setActionError(null);

    if (!canInteract) {
      setActionError("Please log in before downloading this resource.");
      return;
    }

    setIsDownloadSubmitting(true);

    try {
      const response = await fetch(`/api/resources/${resourceId}/download`, {
        method: "POST",
      });

      if (!response.ok) {
        const message = await parseApiErrorMessage(
          response,
          "Failed to record download history.",
        );
        setActionError(message);
        return;
      }

      setDownloadCount((current) => current + 1);
      const opened = window.open(fileUrl, "_blank", "noopener,noreferrer");

      if (!opened) {
        window.location.assign(fileUrl);
      }
    } catch {
      setActionError("Network error while starting download.");
    } finally {
      setIsDownloadSubmitting(false);
    }
  };

  const handleCommentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCommentError(null);

    if (!canInteract) {
      setCommentError("Please log in before posting comments.");
      return;
    }

    const normalizedContent = commentText.trim();

    if (!normalizedContent) {
      setCommentError("Comment content cannot be empty.");
      return;
    }

    setIsCommentSubmitting(true);

    try {
      const response = await fetch(`/api/resources/${resourceId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: normalizedContent,
        }),
      });

      if (!response.ok) {
        const message = await parseApiErrorMessage(response, "Failed to submit comment.");
        setCommentError(message);
        return;
      }

      const createdComment = await parseApiData<CommentItem>(response);

      if (!createdComment) {
        setCommentError("Comment response is malformed.");
        return;
      }

      setComments((current) => [createdComment, ...current]);
      setCommentTotal((current) => current + 1);
      setCommentText("");
    } catch {
      setCommentError("Network error while submitting comment.");
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  return (
    <section className="space-y-6 rounded-2xl border border-[var(--stroke-soft)] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleFavoriteClick}
          disabled={isFavoriteSubmitting}
          className={cn(
            "inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-70",
            isFavorited
              ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
              : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400",
          )}
        >
          {isFavoriteSubmitting ? "Updating..." : isFavorited ? "Favorited" : "Add favorite"}
        </button>

        <button
          type="button"
          onClick={handleDownloadClick}
          disabled={isDownloadSubmitting}
          className="inline-flex items-center rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isDownloadSubmitting ? "Preparing..." : "Download"}
        </button>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {favoriteCount} favorites
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {downloadCount} downloads
        </span>
      </div>

      {interactionHint ? (
        <p className="text-sm text-[var(--text-muted)]">
          {interactionHint}{" "}
          <Link href={loginHref} className="font-semibold text-[var(--brand)] hover:underline">
            Go to login
          </Link>
          .
        </p>
      ) : null}

      {actionError ? <AlertMessage variant="error" message={actionError} className="px-3 py-2" /> : null}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Comments</h2>
          <span className="text-sm text-[var(--text-muted)]">{commentTotal} total</span>
        </div>

        {commentError ? (
          <AlertMessage variant="error" message={commentError} className="px-3 py-2" />
        ) : null}

        <form onSubmit={handleCommentSubmit} className="space-y-3">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-800">Share your thoughts</span>
            <textarea
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="What do you think about this resource?"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <button
            type="submit"
            disabled={isCommentSubmitting}
            className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isCommentSubmitting ? "Posting..." : "Post comment"}
          </button>
        </form>

        {comments.length > 0 ? (
          <ul className="space-y-3">
            {comments.map((comment) => (
              <li
                key={comment.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800">
                    {formatUserLabel(comment.user_id)}
                  </span>
                  <time className="text-xs text-[var(--text-muted)]">
                    {formatDateTimeLabel(comment.created_at)}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap leading-6 text-slate-700">
                  {comment.content}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-[var(--text-muted)]">
            No comments yet. Be the first to share feedback.
          </p>
        )}
      </div>
    </section>
  );
}
