import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Protected app shell layout. Verifies the session server-side.
 * Middleware already protects these routes, but the server component
 * also verifies so there is no single point of trust.
 */
export default async function AppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <>{children}</>;
}
