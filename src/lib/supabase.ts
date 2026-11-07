import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Supabase client — reads credentials from environment variables.
 * Uses VITE_SUPABASE_PUBLISHABLE_KEY (new Supabase key format) with
 * fallback to VITE_SUPABASE_ANON_KEY for backwards compatibility.
 */
const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  "https://dvfoztqxiowryhnlwffs.supabase.co";
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  "your-anon-key";

if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === "your-anon-key") {
  // eslint-disable-next-line no-console
  console.warn(
    "[TokNomics] Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env file.",
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});
