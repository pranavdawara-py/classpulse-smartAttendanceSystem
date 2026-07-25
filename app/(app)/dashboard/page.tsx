import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Role-aware redirect after login.
 * Reads the user's profile.role and sends them to the correct section.
 * - admin    → /admin
 * - teacher  → /teacher
 * - student  → /student
 * - unassigned → waiting/setup state shown inline
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch the application-level role from our profiles table.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, institution_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Profile doesn't exist yet — edge case during initial admin setup.
    return <UnassignedState email={user.email ?? ""} />;
  }

  switch (profile.role) {
    case "admin":
      redirect("/admin");
    case "teacher":
      redirect("/teacher");
    case "student":
      redirect("/student");
    default:
      return <UnassignedState email={user.email ?? ""} />;
  }
}

function UnassignedState({ email }: { email: string }) {
  return (
    <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div className="card" style={{ maxWidth: 440, padding: "40px 36px", textAlign: "center" }}>
        <span style={{ fontSize: 48 }}>🏫</span>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 800, marginTop: 16, marginBottom: 8 }}>
          Account not assigned
        </h1>
        <p style={{ color: "#64748b", fontSize: ".93rem", lineHeight: 1.6, marginBottom: 24 }}>
          Your account <strong>{email}</strong> hasn&apos;t been linked to an institution yet.
          Contact your school administrator to be added to ClassPulse.
        </p>
        <form action="/api/auth/signout" method="POST">
          <button type="submit" className="action action-secondary" style={{ width: "100%" }}>
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
