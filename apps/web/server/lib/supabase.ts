import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config.js";

let adminClient: SupabaseClient | null = null;

/** Client Supabase con service role — solo lato server, bypassa RLS. */
export function getSupabaseAdmin(): SupabaseClient {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) {
    throw new Error(
      "Supabase non configurato: imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in .env"
    );
  }

  if (!adminClient) {
    adminClient = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}
