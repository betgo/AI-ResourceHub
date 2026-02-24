import { NextResponse } from "next/server";

import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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

function normalizeUploadKind(kindValue: FormDataEntryValue | null): UploadKind | null {
  if (kindValue === null || kindValue === "resource") {
    return "resource";
  }

  if (kindValue === "cover") {
    return "cover";
  }

  return null;
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
    const uploadKind = normalizeUploadKind(formData.get("kind"));

    if (!uploadKind) {
      return jsonError(400, "INVALID_KIND", "kind must be either resource or cover.");
    }

    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof File)) {
      return jsonError(400, "INVALID_FILE", "file is required and must be a binary file.");
    }

    const rule = UPLOAD_RULES[uploadKind];

    if (fileEntry.size <= 0) {
      return jsonError(400, "EMPTY_FILE", "Uploaded file cannot be empty.");
    }

    if (fileEntry.size > rule.maxSize) {
      return jsonError(
        400,
        "FILE_TOO_LARGE",
        `File size exceeds the limit of ${Math.floor(rule.maxSize / MB)}MB for ${uploadKind} uploads.`,
      );
    }

    const extension = getFileExtension(fileEntry.name);

    if (!extension || !rule.allowedExtensions.includes(extension)) {
      return jsonError(
        400,
        "INVALID_EXTENSION",
        `Unsupported file extension. Allowed: ${rule.allowedExtensions.join(", ")}.`,
      );
    }

    if (!fileEntry.type || !rule.allowedMimeTypes.includes(fileEntry.type)) {
      return jsonError(
        400,
        "INVALID_MIME_TYPE",
        `Unsupported MIME type. Allowed: ${rule.allowedMimeTypes.join(", ")}.`,
      );
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
        contentType: fileEntry.type,
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
          mimeType: fileEntry.type,
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
