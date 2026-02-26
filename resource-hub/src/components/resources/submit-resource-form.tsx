"use client";

import { FormEvent, KeyboardEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AlertMessage } from "@/components/feedback/alert-message";
import { useToast } from "@/components/feedback/toast-provider";
import { cn } from "@/lib/utils";

type CategoryOption = {
  id: string;
  name: string;
};

type TagOption = {
  id: string;
  name: string;
};

type SubmitResourceFormProps = {
  categories: CategoryOption[];
  suggestedTags: TagOption[];
};

type ApiErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
  };
};

type UploadPayload = {
  url: string;
  originalName: string;
};

type CreateResourcePayload = {
  id: string;
  status: string;
};

const MAX_TAGS = 12;
const RESOURCE_ACCEPTED_EXTENSIONS =
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.csv,.zip,.rar,.7z,.json";
const COVER_ACCEPTED_MIME_TYPES = "image/jpeg,image/png,image/webp";

function normalizeTagName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function splitTagInput(value: string) {
  return value
    .split(/[,，\n]/)
    .map((item) => normalizeTagName(item))
    .filter(Boolean);
}

async function parseApiErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as ApiErrorEnvelope;
    return payload.error?.message || fallback;
  } catch {
    return fallback;
  }
}

async function uploadFile(kind: "resource" | "cover", file: File) {
  const formData = new FormData();
  formData.set("kind", kind);
  formData.set("file", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const message = await parseApiErrorMessage(
      response,
      `Failed to upload ${kind} file.`,
    );
    throw new Error(message);
  }

  const payload = (await response.json()) as { data?: UploadPayload };

  if (!payload.data?.url) {
    throw new Error("Upload response is malformed.");
  }

  return payload.data;
}

export function SubmitResourceForm({ categories, suggestedTags }: SubmitResourceFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceName, setResourceName] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [coverName, setCoverName] = useState("");
  const [isUploadingResource, setIsUploadingResource] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [createdResourceId, setCreatedResourceId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedTagSet = useMemo(
    () => new Set(tags.map((tag) => tag.toLowerCase())),
    [tags],
  );
  const remainingTagSlots = MAX_TAGS - tags.length;
  const canSubmit =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    Boolean(resourceUrl) &&
    !isSubmitting &&
    !isUploadingResource &&
    !isUploadingCover;

  const addTags = (incomingTags: string[]) => {
    if (incomingTags.length === 0) {
      return;
    }

    setSubmitError(null);
    setTags((current) => {
      const nextTags = [...current];
      const existingTagSet = new Set(current.map((tag) => tag.toLowerCase()));

      for (const rawTag of incomingTags) {
        const normalizedTag = normalizeTagName(rawTag);

        if (!normalizedTag) {
          continue;
        }

        const key = normalizedTag.toLowerCase();

        if (existingTagSet.has(key)) {
          continue;
        }

        if (nextTags.length >= MAX_TAGS) {
          break;
        }

        existingTagSet.add(key);
        nextTags.push(normalizedTag);
      }

      return nextTags;
    });
  };

  const handleTagInputSubmit = () => {
    const parsedTags = splitTagInput(tagInput);

    if (parsedTags.length === 0) {
      return;
    }

    addTags(parsedTags);
    setTagInput("");
  };

  const handleTagInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" && event.key !== ",") {
      return;
    }

    event.preventDefault();
    handleTagInputSubmit();
  };

  const handleTagRemove = (targetTag: string) => {
    setTags((current) => current.filter((tag) => tag !== targetTag));
  };

  const handleResourceUpload = async () => {
    if (!resourceFile) {
      const message = "Please select a resource file before uploading.";
      setUploadError(message);
      showToast({
        title: "Upload blocked",
        message,
        variant: "error",
      });
      return;
    }

    setUploadError(null);
    setSubmitError(null);
    setIsUploadingResource(true);

    try {
      const uploaded = await uploadFile("resource", resourceFile);
      setResourceUrl(uploaded.url);
      setResourceName(uploaded.originalName);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown resource upload error.";
      setUploadError(message);
      showToast({
        title: "Resource upload failed",
        message,
        variant: "error",
      });
      setResourceUrl("");
      setResourceName("");
    } finally {
      setIsUploadingResource(false);
    }
  };

  const handleCoverUpload = async () => {
    if (!coverFile) {
      const message = "Please select a cover image before uploading.";
      setUploadError(message);
      showToast({
        title: "Upload blocked",
        message,
        variant: "error",
      });
      return;
    }

    setUploadError(null);
    setSubmitError(null);
    setIsUploadingCover(true);

    try {
      const uploaded = await uploadFile("cover", coverFile);
      setCoverUrl(uploaded.url);
      setCoverName(uploaded.originalName);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown cover upload error.";
      setUploadError(message);
      showToast({
        title: "Cover upload failed",
        message,
        variant: "error",
      });
      setCoverUrl("");
      setCoverName("");
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);
    setCreatedResourceId(null);

    if (!resourceUrl) {
      const message = "Please upload the resource file before submitting.";
      setSubmitError(message);
      showToast({
        title: "Submission blocked",
        message,
        variant: "error",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/resources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          categoryId: categoryId || null,
          tags,
          fileUrl: resourceUrl,
          coverUrl: coverUrl || null,
        }),
      });

      if (!response.ok) {
        const message = await parseApiErrorMessage(response, "Failed to submit the resource.");
        setSubmitError(message);
        showToast({
          title: "Submission failed",
          message,
          variant: "error",
        });
        return;
      }

      const payload = (await response.json()) as { data?: CreateResourcePayload };
      const createdResource = payload.data;

      if (!createdResource?.id) {
        const message = "Create resource response is malformed.";
        setSubmitError(message);
        showToast({
          title: "Submission failed",
          message,
          variant: "error",
        });
        return;
      }

      setCreatedResourceId(createdResource.id);
      setSubmitSuccess("Resource submitted successfully and is now pending admin review.");
      showToast({
        title: "Resource submitted",
        message: "Your resource is now in pending review status.",
        variant: "success",
      });
      setTitle("");
      setDescription("");
      setCategoryId("");
      setTags([]);
      setTagInput("");
      setResourceFile(null);
      setCoverFile(null);
      setResourceUrl("");
      setResourceName("");
      setCoverUrl("");
      setCoverName("");
      router.refresh();
    } catch {
      const message = "Network error while submitting the resource.";
      setSubmitError(message);
      showToast({
        title: "Submission failed",
        message,
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-[var(--stroke-soft)] bg-white p-6 shadow-sm sm:p-8">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Title</span>
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Modern React Architecture Handbook"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Description</span>
            <textarea
              required
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              placeholder="Describe what users will get from this resource..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Category</span>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Uncategorized</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Tags</span>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={handleTagInputKeyDown}
                placeholder="Type tag and press Enter"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={handleTagInputSubmit}
                disabled={!tagInput.trim() || remainingTagSlots <= 0}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Up to {MAX_TAGS} tags, use comma or Enter to separate.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagRemove(tag)}
                className="inline-flex items-center rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand)] transition hover:bg-blue-100"
              >
                #{tag} ×
              </button>
            ))}
          </div>

          {suggestedTags.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Suggested tags
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedTags.map((tag) => {
                  const isSelected = normalizedTagSet.has(tag.name.toLowerCase());

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => addTags([tag.name])}
                      disabled={isSelected || remainingTagSlots <= 0}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold transition",
                        isSelected
                          ? "cursor-not-allowed bg-slate-100 text-slate-400"
                          : "border border-slate-300 text-slate-700 hover:border-slate-400",
                      )}
                    >
                      #{tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-[var(--stroke-soft)] bg-slate-50 p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-800">Resource file</p>
              <p className="text-xs text-[var(--text-muted)]">
                Required. Max 50MB. Supported formats include PDF, Office files, text, and archives.
              </p>
            </div>
            <input
              type="file"
              accept={RESOURCE_ACCEPTED_EXTENSIONS}
              onChange={(event) => {
                const selectedFile = event.target.files?.[0] ?? null;
                setResourceFile(selectedFile);
                setResourceUrl("");
                setResourceName("");
                setUploadError(null);
              }}
              className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-300"
            />
            <button
              type="button"
              onClick={handleResourceUpload}
              disabled={!resourceFile || isUploadingResource}
              className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isUploadingResource ? "Uploading..." : "Upload resource"}
            </button>
            {resourceName && resourceUrl ? (
              <p className="text-xs text-emerald-700">Uploaded: {resourceName}</p>
            ) : null}
          </div>

          <div className="space-y-3 rounded-2xl border border-[var(--stroke-soft)] bg-slate-50 p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-800">Cover image</p>
              <p className="text-xs text-[var(--text-muted)]">
                Optional. Max 5MB. Supported formats: JPG, PNG, WEBP.
              </p>
            </div>
            <input
              type="file"
              accept={COVER_ACCEPTED_MIME_TYPES}
              onChange={(event) => {
                const selectedFile = event.target.files?.[0] ?? null;
                setCoverFile(selectedFile);
                setCoverUrl("");
                setCoverName("");
                setUploadError(null);
              }}
              className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-300"
            />
            <button
              type="button"
              onClick={handleCoverUpload}
              disabled={!coverFile || isUploadingCover}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isUploadingCover ? "Uploading..." : "Upload cover"}
            </button>
            {coverName && coverUrl ? <p className="text-xs text-emerald-700">Uploaded: {coverName}</p> : null}
          </div>
        </div>

        {(uploadError ?? submitError ?? submitSuccess) && (
          <AlertMessage
            message={uploadError ?? submitError ?? submitSuccess ?? ""}
            variant={submitSuccess ? "success" : "error"}
          />
        )}

        {createdResourceId && (
          <div className="rounded-xl border border-[var(--stroke-soft)] bg-slate-50 px-4 py-3 text-xs text-[var(--text-muted)]">
            Resource ID: {createdResourceId}. Save this identifier to track audit status in
            upcoming management pages.
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Submitting..." : "Submit for review"}
          </button>
          <span className="text-xs text-[var(--text-muted)]">
            New resources are created with `pending` status until admin approval.
          </span>
        </div>
      </form>
    </section>
  );
}
