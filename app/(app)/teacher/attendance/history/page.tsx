import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import TeacherHistoryList from "./_components/TeacherHistoryList";

export const metadata = {
  title: "Attendance History — ClassPulse Teacher",
  description: "View all past attendance sessions recorded by this teacher.",
};

export default async function TeacherAttendanceHistoryPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, institution_id")
    .eq("id", user.id)
    .single();

  if (!["teacher", "admin"].includes(profile?.role ?? "") || !profile?.institution_id) {
    redirect("/teacher");
  }

  const admin = createAdminClient();
  if (!admin) redirect("/teacher");

  // Fetch last 60 sessions for this institution (teacher sees their own via lectures.teacher_id)
  const { data: sessions } = await admin
    .from("attendance_sessions")
    .select(`
      id, input_mode, status, confirmed_at,
      lectures (
        id, label, scheduled_starts_at,
        teacher_profiles ( full_name ),
        batches ( name )
      ),
      attendance_entries ( id, status, manually_changed )
    `)
    .eq("institution_id", profile.institution_id)
    .order("confirmed_at", { ascending: false })
    .limit(60);

  return (
    <div className="shell">
      <nav className="nav" style={{ padding: "0 20px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/teacher" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <span style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#6d4aff,#c849f4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</span>
            <span style={{ fontWeight: 800, color: "#172033" }}>ClassPulse</span>
          </a>
          <a href="/teacher" style={{ fontSize: ".83rem", color: "#64748b", fontWeight: 600, textDecoration: "none" }}>← Back to dashboard</a>
        </div>
      </nav>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px 80px" }}>
        <div style={{ marginBottom: 28 }}>
          <p className="eyebrow">Teacher</p>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: 6, marginBottom: 8 }}>Attendance history</h1>
          <p style={{ color: "#64748b", fontSize: ".93rem" }}>
            {(sessions ?? []).length === 0
              ? "No sessions recorded yet."
              : `${(sessions ?? []).length} session${(sessions ?? []).length !== 1 ? "s" : ""} recorded.`}
          </p>
        </div>

        <TeacherHistoryList sessions={(sessions ?? []) as any[]} />
      </main>
    </div>
  );
}
