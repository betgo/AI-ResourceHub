import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

type RequireAdminError = {
  status: 401 | 403;
  code: "UNAUTHORIZED" | "FORBIDDEN";
  message: string;
};

export type RequireAdminUserResult =
  | {
      user: User;
      error: null;
    }
  | {
      user: null;
      error: RequireAdminError;
    };

function normalizeRole(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

export function isAdminUser(user: User) {
  const metadata = user.app_metadata as Record<string, unknown> | null;

  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return false;
  }

  if (metadata.is_admin === true) {
    return true;
  }

  const role = normalizeRole(metadata.role);

  if (role === "admin") {
    return true;
  }

  if (Array.isArray(metadata.roles)) {
    return metadata.roles.some((value) => normalizeRole(value) === "admin");
  }

  return false;
}

export async function requireAdminUser(): Promise<RequireAdminUserResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      user: null,
      error: {
        status: 401,
        code: "UNAUTHORIZED",
        message: "You must sign in as an administrator.",
      },
    };
  }

  if (!isAdminUser(user)) {
    return {
      user: null,
      error: {
        status: 403,
        code: "FORBIDDEN",
        message: "Administrator access is required.",
      },
    };
  }

  return {
    user,
    error: null,
  };
}
