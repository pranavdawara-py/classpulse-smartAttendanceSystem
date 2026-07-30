import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { listStandaloneStudents, getSignedPhotoUrls } from "@/app/actions/standalone/students";
import PersonalModeAuth from "./_components/PersonalModeAuth";
import PersonalModeDashboard from "./_components/PersonalModeDashboard";

export const metadata: Metadata = {
  title: "Personal Mode — ClassPulse",
  description: "Camera-based attendance for independent teachers. No school account needed."
};

export default async function AttendPage() {
  const supabase = await createClient();

  // ── Auth check (no redirect — show inline sign-in instead) ────────────────
  let userId: string | null = null;
  let userEmail: string | null = null;
  let hasDashboard = false;

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userId    = user.id;
      userEmail = user.email ?? null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      hasDashboard = !!(profile?.role && profile.role !== "unassigned");
    }
  }

  // ── Load student roster (only if logged in) ────────────────────────────────
  let students: Awaited<ReturnType<typeof listStandaloneStudents>> = [];
  let photoUrls: Record<string, string> = {};

  if (userId) {
    students = await listStandaloneStudents(userId);
    const allPaths = students.flatMap(s => s.standalone_student_photos.map(p => p.object_path));
    if (allPaths.length) photoUrls = await getSignedPhotoUrls(allPaths);
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#fffbeb 0%,#fef3c7 40%,#f7f8fc 100%)" }}>

      {/* ── Top nav ─────────────────────────────────────────────────────────── */}
      <nav style={{
        borderBottom: "1px solid rgba(180,120,0,.15)",
        background: "rgba(255,255,255,.88)", backdropFilter: "blur(12px)", padding: "0 20px",
        position: "sticky", top: 0, zIndex: 40
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/login" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <span style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: "linear-gradient(135deg,#6d4aff,#c849f4)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14
            }}>⚡</span>
            <span style={{ fontWeight: 800, color: "#172033" }}>ClassPulse</span>
          </a>
          <span style={{
            background: "#fef3c7", color: "#92400e",
            fontSize: ".68rem", fontWeight: 800, letterSpacing: ".05em",
            padding: "2px 8px", borderRadius: 20, border: "1px solid #fcd34d"
          }}>PERSONAL MODE</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {userEmail ? (
              <>
                {hasDashboard && (
                  <a href="/dashboard" style={{ fontSize: ".8rem", color: "#6d4aff", fontWeight: 700, textDecoration: "none" }}>
                    School dashboard
                  </a>
                )}
                <span style={{ fontSize: ".78rem", color: "#64748b", fontWeight: 600, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {userEmail}
                </span>
                <form action="/api/auth/signout" method="POST">
                  <button style={{ fontSize: ".78rem", color: "#92400e", fontWeight: 700, background: "none", border: "1px solid #fcd34d", borderRadius: 8, padding: "5px 12px", cursor: "pointer" }}>
                    Sign out
                  </button>
                </form>
              </>
            ) : null}
          </div>
        </div>
      </nav>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>
        {!userId ? (
          // Not signed in → show auth UI
          <PersonalModeAuth />
        ) : (
          // Signed in → show roster + attendance dashboard
          <PersonalModeDashboard
            userId={userId}
            userEmail={userEmail ?? ""}
            students={students}
            photoUrls={photoUrls}
          />
        )}
      </main>
    </div>
  );
}
