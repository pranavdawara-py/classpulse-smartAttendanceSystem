import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseConfig } from "./config";

/**
 * Creates a Supabase client suitable for use inside Next.js middleware.
 * Reads cookies from the request and propagates refreshed session cookies
 * onto the response so the browser receives updated tokens.
 */
export function createMiddlewareClient(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return { supabase: null, response: NextResponse.next({ request }) };
  }

  // Start with a plain next-response; setAll may replace it to carry new cookies.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseConfig.url!,
    supabaseConfig.anonKey!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
          // Mirror cookies onto the outgoing request (for downstream server components)
          // and onto the response (for the browser).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          );
        }
      }
    }
  );

  return { supabase, response: supabaseResponse };
}
