const PUBLIC_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

const SERVER_ENV_KEYS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_STORAGE_BUCKET",
] as const;

type PublicEnvKey = (typeof PUBLIC_ENV_KEYS)[number];
type ServerEnvKey = (typeof SERVER_ENV_KEYS)[number];
type RequiredEnvKey = PublicEnvKey | ServerEnvKey;

function readRequiredEnv(key: RequiredEnvKey): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function buildValidatedEnv<T extends readonly RequiredEnvKey[]>(
  keys: T,
): Record<T[number], string> {
  return keys.reduce(
    (accumulator, key) => ({
      ...accumulator,
      [key]: readRequiredEnv(key),
    }),
    {} as Record<T[number], string>,
  );
}

export const publicEnv = Object.freeze(buildValidatedEnv(PUBLIC_ENV_KEYS));

const serverEnv =
  typeof window === "undefined"
    ? Object.freeze(buildValidatedEnv(SERVER_ENV_KEYS))
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
