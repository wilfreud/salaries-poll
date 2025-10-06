import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

const supabaseUrl = env.supabaseUrl;
const supabaseAnonKey = env.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials are missing. Please configure the .env file."
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
