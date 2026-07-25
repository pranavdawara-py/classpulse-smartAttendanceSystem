import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles Supabase email-confirmation redirects (PKCE flow).
 *
 * Supabase sends the user here after they click the verification link in their email.
 * The URL contains a `code` query param which is exchanged for a session.
 *
 * For school signups, the school name and timezone were stored in user_metadata
 * at signUp() time. We call bootstrap_institution() here once the session exists.
 *
 * Required: add http://localhost:3000/auth/callback to Supabase
 * Authentication → URL Configuration → Redirect URLs.
 * Add the production URL too when deploying.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    // No code — corrupted or expired link.
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login?error=not_configured`);
  }

  // Exchange the one-time code for a persistent session.
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("[auth/callback] exchangeCodeForSession error:", exchangeError.message);
    return NextResponse.redirect(`${origin}/login?error=link_expired`);
  }

  // Session is now established. Fetch the verified user.
  const { data: { user } } = await supabase.auth.getUser();

  if (user?.user_metadata?.school_name) {
    // School signup path — bootstrap the institution.
    // bootstrap_institution() is a security-definer RPC that:
    //   1. Creates the institution row
    //   2. Updates the profile to role='admin' + institution_id
    // It's idempotent against double-calls (raises if already assigned).
    const { error: rpcError } = await supabase.rpc("bootstrap_institution", {
      institution_name: user.user_metadata.school_name as string,
      institution_timezone: (user.user_metadata.school_timezone as string) ?? "Asia/Kolkata"
    });

    if (rpcError && !rpcError.message.includes("already assigned")) {
      // Unexpected error during bootstrap. Log and redirect to an error state.
      console.error("[auth/callback] bootstrap_institution error:", rpcError.message);
      return NextResponse.redirect(`${origin}/login?error=bootstrap_failed`);
    }
  }

  // Redirect to dashboard — it will read the role and send the user to /admin, /teacher, etc.
  return NextResponse.redirect(`${origin}/dashboard`);
}
