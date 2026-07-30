import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles Supabase email-confirmation redirects (PKCE flow).
 *
 * For school signups: runs bootstrap_institution + sets location.
 * For personal accounts: skips school bootstrap, reads `next` param to redirect.
 *
 * Supports `?next=<path>` on the callback URL so signup forms can route users
 * back to the right page after verification (e.g., /attend for Personal Mode).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // `next` lets callers send the user to a specific page after verification.
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login?error=not_configured`);
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("[auth/callback] exchangeCodeForSession error:", exchangeError.message);
    return NextResponse.redirect(`${origin}/login?error=link_expired`);
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (user?.user_metadata?.school_name) {
    // ── School signup: bootstrap institution ─────────────────────────────────
    const schoolName     = user.user_metadata.school_name as string;
    const schoolTimezone = (user.user_metadata.school_timezone as string) ?? "Asia/Kolkata";
    const schoolCountry  = (user.user_metadata.school_country as string) ?? "";
    const schoolState    = (user.user_metadata.school_state   as string) ?? "";
    const schoolCity     = (user.user_metadata.school_city    as string) ?? "";

    const { error: rpcError } = await supabase.rpc("bootstrap_institution", {
      institution_name: schoolName,
      institution_timezone: schoolTimezone
    });

    if (rpcError && !rpcError.message.includes("already assigned")) {
      console.error("[auth/callback] bootstrap_institution error:", rpcError.message);
      return NextResponse.redirect(`${origin}/login?error=bootstrap_failed`);
    }

    if (schoolCountry || schoolState || schoolCity) {
      await supabase.rpc("set_institution_location", {
        p_country: schoolCountry,
        p_state:   schoolState,
        p_city:    schoolCity
      });
    }

    // School users always go to dashboard → admin.
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  // ── Personal account (no school_name): honour `next` param ───────────────
  // Validate `next` to only allow same-origin relative paths.
  const safePath = next.startsWith("/") ? next : "/attend";
  return NextResponse.redirect(`${origin}${safePath}`);
}

