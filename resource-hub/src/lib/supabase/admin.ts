import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getServerEnv, publicEnv } from "@/lib/env";

let adminClient: ReturnType<typeof createClient> | null = null;

export function createAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  const serverEnv = getServerEnv();

  adminClient = createClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  return adminClient;
}
