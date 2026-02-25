import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getZodErrorMessage, uploadFormDataSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

type UploadKind = "resource" | "cover";

type UploadRule = {
  maxSize: number;
  allowedExtensions: readonly string[];
  allowedMimeTypes: readonly string[];
};

const MB = 1024 * 1024;
const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;

const UPLOAD_RULES: Record<UploadKind, UploadRule> = {
  resource: {
    maxSize: 50 * MB,
    allowedExtensions: [
      "pdf",
      "doc",
      "docx",
      "ppt",
      "pptx",
      "xls",
      "xlsx",
      "txt",
      "md",
      "csv",
      "zip",
      "rar",
      "7z",
      "json",
    ],
    allowedMimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "text/markdown",
      "text/csv",
      "application/zip",
      "application/x-zip-compressed",
      "application/vnd.rar",
      "application/x-rar-compressed",
      "application/x-7z-compressed",
      "application/json",
    ],
  },
  cover: {
    maxSize: 5 * MB,
    allowedExtensions: ["jpg", "jpeg", "png", "webp"],
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
};

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status },
  );
}

function getFileExtension(fileName: string) {
  const index = fileName.lastIndexOf(".");

  if (index <= 0 || index === fileName.length - 1) {
    return "";
  }

  return fileName.slice(index + 1).toLowerCase();
}

function sanitizeFileName(fileName: string) {
  return fileName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-+/g, "-");
}

function buildStoragePath(userId: string, kind: UploadKind, originalName: string) {
  const extension = getFileExtension(originalName);
  const baseName = sanitizeFileName(originalName.replace(/\.[^/.]+$/, "")) || "file";
  const stamp = `${Date.now()}-${crypto.randomUUID()}`;

  return `${userId}/${kind}/${stamp}-${baseName}.${extension}`;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonError(401, "UNAUTHORIZED", "You must sign in before uploading files.");
  }

  try {
    const formData = await request.formData();
    const formDataResult = uploadFormDataSchema.safeParse({
      kind: formData.get("kind"),
      file: formData.get("file"),
    });

    if (!formDataResult.success) {
      return jsonError(400, "INVALID_REQUEST_BODY", getZodErrorMessage(formDataResult.error));
    }

    const { kind: uploadKind, file: fileEntry } = formDataResult.data;
    const mimeType = fileEntry.type.trim().toLowerCase();

    const rule = UPLOAD_RULES[uploadKind];
    const fileMetaResult = z
      .object({
        name: z.string().trim().min(1, "Uploaded file name is required."),
        size: z
          .number()
          .int()
          .positive("Uploaded file cannot be empty.")
          .max(
            rule.maxSize,
            `File size exceeds the limit of ${Math.floor(rule.maxSize / MB)}MB for ${uploadKind} uploads.`,
          ),
        mimeType: z
          .string()
          .trim()
          .min(1, "Uploaded file MIME type is required.")
          .refine((value) => rule.allowedMimeTypes.includes(value), {
            message: `Unsupported MIME type. Allowed: ${rule.allowedMimeTypes.join(", ")}.`,
          }),
      })
      .safeParse({
        name: fileEntry.name,
        size: fileEntry.size,
        mimeType,
      });

    if (!fileMetaResult.success) {
      const firstIssue = fileMetaResult.error.issues[0];

      if (firstIssue?.path[0] === "size" && firstIssue.code === "too_big") {
        return jsonError(400, "FILE_TOO_LARGE", firstIssue.message);
      }

      if (firstIssue?.path[0] === "size") {
        return jsonError(400, "EMPTY_FILE", firstIssue.message);
      }

      if (firstIssue?.path[0] === "mimeType") {
        return jsonError(400, "INVALID_MIME_TYPE", firstIssue.message);
      }

      return jsonError(400, "INVALID_FILE", firstIssue?.message ?? "Uploaded file is invalid.");
    }

    const extension = getFileExtension(fileEntry.name);
    const extensionResult = z
      .string()
      .min(1, "Uploaded file extension is required.")
      .refine((value) => rule.allowedExtensions.includes(value), {
        message: `Unsupported file extension. Allowed: ${rule.allowedExtensions.join(", ")}.`,
      })
      .safeParse(extension);

    if (!extensionResult.success) {
      return jsonError(400, "INVALID_EXTENSION", getZodErrorMessage(extensionResult.error));
    }

    const storagePath = buildStoragePath(user.id, uploadKind, fileEntry.name);
    const fileBuffer = Buffer.from(await fileEntry.arrayBuffer());
    const adminClient = createAdminClient();
    const { SUPABASE_STORAGE_BUCKET } = getServerEnv();
    const storageBucket = adminClient.storage.from(SUPABASE_STORAGE_BUCKET);

    const { data: uploadData, error: uploadError } = await storageBucket.upload(
      storagePath,
      fileBuffer,
      {
        contentType: mimeType,
        cacheControl: "3600",
        upsert: false,
      },
    );

    if (uploadError || !uploadData) {
      return jsonError(500, "UPLOAD_FAILED", uploadError?.message ?? "Failed to upload file.");
    }

    const { data: publicUrlData } = storageBucket.getPublicUrl(uploadData.path);
    const { data: signedUrlData } = await storageBucket.createSignedUrl(
      uploadData.path,
      SIGNED_URL_EXPIRES_IN_SECONDS,
    );

    const accessibleUrl = signedUrlData?.signedUrl ?? publicUrlData.publicUrl;

    if (!accessibleUrl) {
      return jsonError(500, "URL_GENERATION_FAILED", "File uploaded but URL generation failed.");
    }

    return NextResponse.json(
      {
        data: {
          bucket: SUPABASE_STORAGE_BUCKET,
          path: uploadData.path,
          kind: uploadKind,
          originalName: fileEntry.name,
          extension,
          size: fileEntry.size,
          mimeType,
          url: accessibleUrl,
          publicUrl: publicUrlData.publicUrl,
          signedUrl: signedUrlData?.signedUrl ?? null,
          signedUrlExpiresIn: SIGNED_URL_EXPIRES_IN_SECONDS,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown upload error.";

    return jsonError(500, "INTERNAL_SERVER_ERROR", message);
  }
}
