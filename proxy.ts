import { type NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

// Routes that require authentication.
const PROTECTED_PREFIXES = ["/admin", "/teacher", "/student", "/dashboard"];
// Route prefixes only for unauthenticated users — redirect logged-in users to /dashboard.
const AUTH_ONLY_PREFIXES = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request);
  const path = request.nextUrl.pathname;

  // If Supabase is not configured, let pages handle the configuration state.
  if (!supabase) return response;

  // Always call getUser() so the session is refreshed and cookies are updated.
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  const isAuthOnly = AUTH_ONLY_PREFIXES.some((p) => path.startsWith(p));

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthOnly && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Run middleware on all paths except Next.js internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
