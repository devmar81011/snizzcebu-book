import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://scjeculrqaxrpyjvjbrz.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjamVjdWxycWF4cnB5anZqYnJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMDY1MzcsImV4cCI6MjA5OTc4MjUzN30.TQFEYW1z9Fky287tvDjALogmGfwNm-_Ll-_egPMEPWo";

export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url && !url.includes("your-project")) return url;
  return DEFAULT_SUPABASE_URL;
}

export function getSupabaseKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY
  );
}

/** True when Supabase is configured (defaults cover the booking project). */
export function hasSupabaseStore(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseKey());
}

let client: SupabaseClient | null = null;

/** Server-side Supabase client (service role preferred). */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  client = createClient(getSupabaseUrl(), getSupabaseKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
