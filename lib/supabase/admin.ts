import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client authenticated with the service role (secret) key.
 *
 * ⚠️  This client bypasses Row Level Security entirely.
 *     NEVER import this in client components or expose it to the browser.
 *     Use ONLY in Server Actions and Route Handlers.
 *
 * Interim pattern (pre-FastAPI): Next.js Server Actions use this client to
 * create teacher/student auth accounts and perform institution writes that
 * RLS intentionally blocks from the anon/authenticated role.
 *
 * When FastAPI is introduced, these operations move there and this helper
 * is only used for thin admin helpers in Next.js (e.g. session validation).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
