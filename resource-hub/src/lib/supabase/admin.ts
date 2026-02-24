import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getServerEnv, publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

let adminClient: SupabaseClient<Database> | null = null;

export function createAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  const serverEnv = getServerEnv();

  adminClient = createClient<Database>(
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
