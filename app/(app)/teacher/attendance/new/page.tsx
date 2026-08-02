import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAttendanceFormData } from "@/app/actions/teacher/attendance";
import AttendanceWizard from "./_components/AttendanceWizard";

export const metadata = {
  title: "Take Attendance — ClassPulse",
  description: "Mark attendance using camera face recognition or manual roll call.",
};

export default async function NewAttendancePage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role, institution_id").eq("id", user.id).single();

  if (!["teacher", "admin"].includes(profile?.role ?? "")) redirect("/dashboard");
  if (!profile?.institution_id) redirect("/dashboard");

  const institutionId = profile.institution_id;
  const { batches, students } = await getAttendanceFormData(institutionId);

  // Fetch face enrolment photos so CameraAttendance can enrol faces in backend
  const admin = createAdminClient();
  let photoUrls: Record<string, string[]> = {};

  if (admin && students.length > 0) {
    const studentIds = students.map(s => s.profile_id);
    const { data: enrolments } = await admin
      .from("face_enrolments")
      .select("student_id, image_path")
      .in("student_id", studentIds)
      .eq("institution_id", institutionId);

    if (enrolments && enrolments.length > 0) {
      const paths = enrolments.map((e: { image_path: string }) => e.image_path);
      const { data: signed } = await admin.storage
        .from("standalone-photos")
        .createSignedUrls(paths, 3600);

      const urlMap = Object.fromEntries(
        (signed ?? []).map(item => [item.path, item.signedUrl ?? ""])
      );

      // Group signed URLs by student_id
      for (const enrolment of enrolments as { student_id: string; image_path: string }[]) {
        const url = urlMap[enrolment.image_path];
        if (url) {
          if (!photoUrls[enrolment.student_id]) photoUrls[enrolment.student_id] = [];
          photoUrls[enrolment.student_id].push(url);
        }
      }
    }
  }

  return (
    <div className="shell">
      {/* Nav bar */}
      <nav className="nav" style={{ padding: "0 20px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/teacher" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <span style={{
              width: 30, height: 30, borderRadius: 8,
              background: "linear-gradient(135deg,#6d4aff,#c849f4)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14
            }}>⚡</span>
            <span style={{ fontWeight: 800, color: "#172033" }}>ClassPulse</span>
          </a>
          <a href="/teacher" style={{ fontSize: ".83rem", color: "#64748b", fontWeight: 600, textDecoration: "none" }}>
            ← Back to dashboard
          </a>
        </div>
      </nav>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px 64px" }}>
        <div style={{ marginBottom: 28 }}>
          <p className="eyebrow">Mark attendance</p>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: 6, marginBottom: 8 }}>
            New session
          </h1>
          <p style={{ color: "#64748b", fontSize: ".93rem" }}>
            {students.length === 0
              ? "No students have been added yet. Ask your administrator to add students first."
              : "Select the students, mark attendance, and save."}
          </p>
        </div>

        {students.length === 0 ? (
          <div className="card" style={{ padding: "40px 24px", textAlign: "center" }}>
            <span style={{ fontSize: 48 }}>🎓</span>
            <h2 style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>No students yet</h2>
            <p style={{ color: "#64748b", maxWidth: 360, margin: "0 auto" }}>
              Your school administrator needs to add students before you can mark attendance.
            </p>
          </div>
        ) : (
          <AttendanceWizard batches={batches} students={students} institutionId={institutionId} photoUrls={photoUrls} />
        )}
      </main>
    </div>
  );
}
