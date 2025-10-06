import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

const supabaseUrl = env.supabaseUrl;
const supabaseAnonKey = env.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "⚠️ Supabase credentials are missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables."
  );
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
        },
      })
    : undefined;
