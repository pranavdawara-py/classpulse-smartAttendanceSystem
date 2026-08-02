import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Admin Dashboard — ClassPulse",
  description: "Manage your school's teachers, students, and attendance settings.",
};

export default async function AdminHomePage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, institution_id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" || !profile.institution_id) redirect("/dashboard");

  const admin = createAdminClient();
  const instId = profile.institution_id;

  // Parallel stat fetches — all lightweight count queries
  const [studentRes, teacherRes, photoRes, sessionRes] = await Promise.all([
    admin?.from("student_profiles").select("profile_id", { count: "exact", head: true }).eq("institution_id", instId).eq("active", true),
    admin?.from("teacher_profiles").select("profile_id", { count: "exact", head: true }).eq("institution_id", instId),
    admin?.from("face_enrolments").select("id", { count: "exact", head: true }).eq("institution_id", instId),
    admin?.from("attendance_sessions").select("id", { count: "exact", head: true }).eq("institution_id", instId),
  ]);

  const stats = {
    students: studentRes?.count ?? 0,
    teachers:  teacherRes?.count ?? 0,
    photos:    photoRes?.count ?? 0,
    sessions:  sessionRes?.count ?? 0,
  };

  return (
    <main className="page">
      <div style={{ marginBottom: 28 }}>
        <p className="eyebrow">School administration</p>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginTop: 6, marginBottom: 8 }}>
          Admin Dashboard
        </h1>
        <p style={{ color: "#64748b", fontSize: ".95rem" }}>
          Manage your school&apos;s teachers, students, and attendance.
        </p>
      </div>

      {/* Live stats bar */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: 12, marginBottom: 32
      }}>
        {[
          { label: "Students",       value: stats.students,  icon: "🎓", color: "#6d4aff", bg: "#f5f3ff" },
          { label: "Teachers",       value: stats.teachers,  icon: "👩‍🏫", color: "#0d9488", bg: "#f0fdfa" },
          { label: "Photos enrolled",value: stats.photos,   icon: "📸", color: "#0284c7", bg: "#eff6ff" },
          { label: "Sessions taken", value: stats.sessions,  icon: "✅", color: "#16a34a", bg: "#f0fdf4" },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 16, padding: "16px 18px", border: `1px solid ${s.bg}` }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ color: "#64748b", fontSize: ".75rem", fontWeight: 600, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", marginBottom: 28 }}>
        <Link href="/admin/teachers" style={{ textDecoration: "none" }}>
          <div className="card" style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
            <span style={{ fontSize: 26 }}>👩‍🏫</span>
            <div>
              <p style={{ fontWeight: 800, fontSize: ".93rem" }}>Manage Teachers</p>
              <p style={{ color: "#64748b", fontSize: ".78rem" }}>Invite &amp; manage teacher accounts</p>
            </div>
            <span style={{ marginLeft: "auto", color: "#94a3b8" }}>→</span>
          </div>
        </Link>
        <Link href="/admin/students" style={{ textDecoration: "none" }}>
          <div className="card" style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
            <span style={{ fontSize: 26 }}>🎓</span>
            <div>
              <p style={{ fontWeight: 800, fontSize: ".93rem" }}>Manage Students</p>
              <p style={{ color: "#64748b", fontSize: ".78rem" }}>Add students, batches &amp; photos</p>
            </div>
            <span style={{ marginLeft: "auto", color: "#94a3b8" }}>→</span>
          </div>
        </Link>
      </div>

      {/* Setup checklist */}
      <h2 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: 14 }}>Setup checklist</h2>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))" }}>
        <SetupCard icon="🏫" step="1" title="Institution profile"
          body="Your school name and location were set up during registration."
          status="done" href={null} />
        <SetupCard icon="👩‍🏫" step="2" title="Teacher accounts"
          body="Invite teachers by email. They set their own passwords and can log in immediately."
          status={stats.teachers > 0 ? "done" : "active"} href="/admin/teachers" />
        <SetupCard icon="🎓" step="3" title="Students & groups"
          body="Add student records, create batches or sections, and assign students."
          status={stats.students > 0 ? "done" : "active"} href="/admin/students" />
        <SetupCard icon="📸" step="4" title="Student face photos"
          body="Students upload their photos via their account. School-uploaded photos are locked."
          status={stats.photos > 0 ? "done" : "active"} href="/admin/students" />
        <SetupCard icon="✅" step="5" title="Attendance history"
          body="Teachers view attendance records, download CSVs, and review corrections."
          status={stats.sessions > 0 ? "done" : "active"} href="/teacher/attendance/history" />
        <SetupCard icon="📅" step="6" title="Schedule & timetable"
          body="Define your weekly timetable. Teachers can also mark attendance without a schedule."
          status="coming-soon" href={null} />
      </div>
    </main>
  );
}

function SetupCard({
  icon, step, title, body, status, href
}: {
  icon: string; step: string; title: string; body: string;
  status: "done" | "active" | "coming-soon"; href: string | null;
}) {
  const badge =
    status === "done"        ? { bg: "#ecfdf5", color: "#065f46", label: "Done ✓" }
    : status === "active"    ? { bg: "#eff6ff", color: "#1d4ed8", label: "Set up →" }
    : { bg: "#f8fafc", color: "#64748b", label: "Coming soon" };

  const inner = (
    <div className="card" style={{ padding: "20px 20px", opacity: status === "coming-soon" ? .6 : 1, height: "100%", transition: "box-shadow .15s" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 26 }}>{icon}</span>
        <span style={{ background: badge.bg, color: badge.color, borderRadius: 6, padding: "2px 9px", fontSize: ".72rem", fontWeight: 700 }}>
          {badge.label}
        </span>
      </div>
      <p style={{ color: "#6d4aff", fontSize: ".72rem", fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 4 }}>
        Step {step}
      </p>
      <h3 style={{ fontWeight: 800, fontSize: ".95rem", marginBottom: 6 }}>{title}</h3>
      <p style={{ color: "#64748b", fontSize: ".85rem", lineHeight: 1.5 }}>{body}</p>
    </div>
  );

  if (href && status !== "coming-soon") {
    return <Link href={href} style={{ textDecoration: "none", display: "block" }}>{inner}</Link>;
  }
  return inner;
}
