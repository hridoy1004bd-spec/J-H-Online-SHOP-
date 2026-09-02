import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  // Loud, early failure instead of silently hitting undefined endpoints.
  // eslint-disable-next-line no-console
  console.error(
    "[J H Online SHOP] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. " +
      "Copy .env.example to .env and fill in your Supabase project credentials."
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

// Base URL for calling Edge Functions (send-otp / verify-otp / create-order).
export const FUNCTIONS_URL = `${url}/functions/v1`;
