type RequiredEnvKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "SUPABASE_STORAGE_BUCKET";

function readRequiredEnv(key: RequiredEnvKey, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export const publicEnv = Object.freeze({
  NEXT_PUBLIC_SUPABASE_URL: readRequiredEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: readRequiredEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
});

const serverEnv =
  typeof window === "undefined"
    ? Object.freeze({
        SUPABASE_SERVICE_ROLE_KEY: readRequiredEnv(
          "SUPABASE_SERVICE_ROLE_KEY",
          process.env.SUPABASE_SERVICE_ROLE_KEY,
        ),
        SUPABASE_STORAGE_BUCKET: readRequiredEnv(
          "SUPABASE_STORAGE_BUCKET",
          process.env.SUPABASE_STORAGE_BUCKET,
        ),
      })
    : null;

export function getServerEnv() {
  if (!serverEnv) {
    throw new Error("getServerEnv() can only be called on the server.");
  }

  return serverEnv;
}

export const env = Object.freeze({
  ...publicEnv,
  ...(serverEnv ?? {}),
});
