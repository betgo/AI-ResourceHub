import { z } from "zod";

const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_URL_LENGTH = 2048;
const MAX_TAGS = 12;
const MAX_TAG_LENGTH = 40;
const MAX_COMMENT_LENGTH = 1000;
const MAX_REVIEW_REASON_LENGTH = 500;

const HTML_TAG_REGEX = /<[^>]*>/g;
const CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F]/g;

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeNullableText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return value === undefined ? undefined : null;
  }

  const normalized = normalizeText(value);
  return normalized || null;
}

function sanitizeCommentContent(value: string) {
  return normalizeText(value.replace(HTML_TAG_REGEX, " ").replace(CONTROL_CHAR_REGEX, " "));
}

const normalizedUuidSchema = z
  .string()
  .trim()
  .uuid("id must be a valid UUID.");

const optionalCategoryIdSchema = z.preprocess(
  (value) => normalizeNullableText(value as string | null | undefined),
  z.union([z.string().uuid("categoryId must be a valid UUID."), z.null()]),
);

const requiredUrlSchema = z
  .string()
  .trim()
  .min(1, "fileUrl is required.")
  .max(MAX_URL_LENGTH, `fileUrl must be at most ${MAX_URL_LENGTH} characters.`)
  .url("fileUrl must be a valid URL.");

const optionalNullableUrlSchema = z.preprocess(
  (value) => normalizeNullableText(value as string | null | undefined),
  z.union([
    z
      .string()
      .max(MAX_URL_LENGTH, `coverUrl must be at most ${MAX_URL_LENGTH} characters.`)
      .url("coverUrl must be a valid URL."),
    z.null(),
  ]),
);

const normalizedTagsSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1, "Each tag must be a non-empty string.")
      .max(MAX_TAG_LENGTH, `Each tag must be at most ${MAX_TAG_LENGTH} characters.`)
      .transform((value) => normalizeText(value)),
    {
      error: "tags must be an array of strings.",
    },
  )
  .optional()
  .default([])
  .transform((tags) => {
    const dedupedTags: string[] = [];
    const tagSet = new Set<string>();

    for (const tag of tags) {
      const normalized = normalizeText(tag);

      if (!normalized) {
        continue;
      }

      const key = normalized.toLowerCase();

      if (tagSet.has(key)) {
        continue;
      }

      tagSet.add(key);
      dedupedTags.push(normalized);
    }

    return dedupedTags;
  })
  .refine((tags) => tags.length <= MAX_TAGS, {
    message: `tags cannot exceed ${MAX_TAGS} items.`,
  });

export const resourceIdParamSchema = z.object({
  id: normalizedUuidSchema,
});

export const createResourceBodySchema = z
  .object({
    categoryId: optionalCategoryIdSchema.optional(),
    title: z
      .string()
      .trim()
      .min(1, "title is required and must be a non-empty string.")
      .max(MAX_TITLE_LENGTH, `title must be at most ${MAX_TITLE_LENGTH} characters.`)
      .transform((value) => normalizeText(value)),
    description: z
      .string()
      .trim()
      .min(1, "description is required and must be a non-empty string.")
      .max(
        MAX_DESCRIPTION_LENGTH,
        `description must be at most ${MAX_DESCRIPTION_LENGTH} characters.`,
      )
      .transform((value) => normalizeText(value)),
    fileUrl: requiredUrlSchema,
    coverUrl: optionalNullableUrlSchema.optional(),
    tags: normalizedTagsSchema,
  })
  .transform((value) => ({
    ...value,
    categoryId: value.categoryId ?? undefined,
    coverUrl: value.coverUrl ?? undefined,
  }));

export const updateResourceBodySchema = z
  .object({
    categoryId: optionalCategoryIdSchema.optional(),
    title: z
      .string()
      .trim()
      .min(1, "title must be a non-empty string.")
      .max(MAX_TITLE_LENGTH, `title must be at most ${MAX_TITLE_LENGTH} characters.`)
      .transform((value) => normalizeText(value))
      .optional(),
    description: z
      .string()
      .trim()
      .min(1, "description must be a non-empty string.")
      .max(
        MAX_DESCRIPTION_LENGTH,
        `description must be at most ${MAX_DESCRIPTION_LENGTH} characters.`,
      )
      .transform((value) => normalizeText(value))
      .optional(),
    fileUrl: requiredUrlSchema.optional(),
    coverUrl: optionalNullableUrlSchema.optional(),
  })
  .refine(
    (value) =>
      value.categoryId !== undefined ||
      value.title !== undefined ||
      value.description !== undefined ||
      value.fileUrl !== undefined ||
      value.coverUrl !== undefined,
    {
      message: "At least one updatable field is required.",
    },
  );

export const createCommentBodySchema = z.object({
  content: z
    .string()
    .min(1, "content is required and must be a non-empty string.")
    .max(
      MAX_COMMENT_LENGTH * 2,
      `content must be at most ${MAX_COMMENT_LENGTH * 2} characters before sanitization.`,
    )
    .transform((value) => sanitizeCommentContent(value))
    .refine((value) => value.length > 0, {
      message: "content cannot be empty after sanitization.",
    })
    .refine((value) => value.length <= MAX_COMMENT_LENGTH, {
      message: `content must be at most ${MAX_COMMENT_LENGTH} characters.`,
    }),
});

export const reviewBodySchema = z
  .object({
    action: z.enum(["approve", "reject"], {
      error: "action must be one of approve or reject.",
    }),
    reason: z
      .preprocess(
        (value) => normalizeNullableText(value as string | null | undefined),
        z
          .union([
            z
              .string()
              .max(
                MAX_REVIEW_REASON_LENGTH,
                `reason must be at most ${MAX_REVIEW_REASON_LENGTH} characters.`,
              ),
            z.null(),
          ])
          .optional(),
      )
      .optional(),
  })
  .transform((value) => ({
    action: value.action,
    reason: value.reason ?? null,
  }))
  .superRefine((value, ctx) => {
    if (value.action === "reject" && !value.reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "reason is required when action is reject.",
        path: ["reason"],
      });
    }
  });

export const uploadKindSchema = z.enum(["resource", "cover"]);

export const uploadFormDataSchema = z.object({
  kind: z.preprocess((value) => (value == null ? "resource" : value), uploadKindSchema),
  file: z.instanceof(File, {
    error: "file is required and must be a binary file.",
  }),
});

export function getZodErrorMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid request payload.";
}

export function getZodErrorDetails(error: z.ZodError) {
  return error.flatten();
}

