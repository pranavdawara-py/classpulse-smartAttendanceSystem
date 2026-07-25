"use client";

import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured, supabaseConfig } from "./config";

export function createClient() {
  if (!isSupabaseConfigured()) throw new Error("SUPABASE_NOT_CONFIGURED");
  return createBrowserClient(supabaseConfig.url!, supabaseConfig.anonKey!);
}
