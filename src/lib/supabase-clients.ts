import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseConnection } from "./types";

export type ConnectionCredentials = Pick<
  SupabaseConnection,
  "id" | "url" | "anonKey"
>;

const cache = new Map<string, SupabaseClient>();

export function getSupabaseForConnection(conn: ConnectionCredentials): SupabaseClient {
  const existing = cache.get(conn.id);
  if (existing) return existing;

  const client = createClient(conn.url.trim(), conn.anonKey.trim(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  cache.set(conn.id, client);
  return client;
}

export function invalidateConnectionCache(connectionId: string) {
  cache.delete(connectionId);
}
