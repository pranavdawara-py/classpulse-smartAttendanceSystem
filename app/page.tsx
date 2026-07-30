import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Root route: role-aware redirect.
 * - admin    → /admin
 * - teacher  → /teacher
 * - student  → /student
 * - unassigned (has account) → /attend (Personal Mode)
 * - not logged in → /login
 *
 * /dashboard also does this, but routing from root avoids the extra hop.
 */
export default async function RootPage() {
  const supabase = await createClient();

  if (!supabase) {
    redirect("/login");
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Read role from profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  switch (profile?.role) {
    case "admin":
      redirect("/admin");
    case "teacher":
      redirect("/teacher");
    case "student":
      redirect("/student");
    default:
      // Unassigned school account → send to Personal Mode which has its own auth flow
      redirect("/attend");
  }
}
