import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Root route: immediately redirect to /dashboard (authenticated)
 * or /login (unauthenticated). Middleware will also enforce this,
 * but a server component redirect is cleaner than a blank flash.
 */
export default async function RootPage() {
  const supabase = await createClient();

  if (!supabase) {
    // Supabase not configured yet — send to login which will show config guidance.
    redirect("/login");
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
