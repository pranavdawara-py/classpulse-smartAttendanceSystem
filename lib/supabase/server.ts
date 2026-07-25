import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isSupabaseConfigured, supabaseConfig } from "./config";

export async function createClient() {
  if (!isSupabaseConfigured()) return null;
  const cookieStore = await cookies();
  return createServerClient(supabaseConfig.url!, supabaseConfig.anonKey!, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} }
  });
}
