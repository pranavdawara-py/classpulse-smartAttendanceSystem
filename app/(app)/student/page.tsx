import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import StudentPhotoPanel from "./_components/StudentPhotoPanel";
import { listStudentPhotos, getStudentPhotoSignedUrls } from "@/app/actions/student/photos";

export const metadata: Metadata = {
  title: "My Attendance — ClassPulse",
  description: "View your attendance record and class history on ClassPulse."
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface AttendanceEntry {
  id: string;
  status: "present" | "absent";
  marked_at: string;
  manually_changed: boolean;
  lectures: {
    id: string;
    started_at: string;
    label: string | null;
    courses: { name: string; code: string | null } | null;
    batches: { name: string } | null;
  } | null;
}

// ── Server Component ──────────────────────────────────────────────────────────

export default async function StudentPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, institution_id, display_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "student") redirect("/dashboard");

  // Get student profile
  const { data: studentProfile } = await supabase
    .from("student_profiles")
    .select("full_name, roll_number, login_id, phone_number")
    .eq("profile_id", user.id)
    .single();

  // Get institution info
  const { data: institution } = profile?.institution_id
    ? await supabase.from("institutions").select("name").eq("id", profile.institution_id).single()
    : { data: null };

  // Get attendance history (last 60 days, max 100 entries)
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const [entriesRes, photosRes] = await Promise.all([
    supabase
      .from("attendance_entries")
      .select(`
        id, status, marked_at, manually_changed,
        lectures(id, started_at, label,
          courses(name, code),
          batches(name)
        )
      `)
      .eq("student_id", user.id)
      .gte("marked_at", since)
      .order("marked_at", { ascending: false })
      .limit(100),
    profile?.institution_id
      ? listStudentPhotos(user.id, profile.institution_id)
      : Promise.resolve([])
  ]);

  const { data: entries } = entriesRes;
  const photos = photosRes as { id: string; image_path: string; school_locked: boolean; uploaded_by_role: "school" | "student" | null; created_at: string }[];

  // Get signed URLs for photos
  const signedUrlMap = photos.length > 0
    ? await getStudentPhotoSignedUrls(photos.map(p => p.image_path))
    : {};

  const attendanceEntries = ((entries ?? []) as unknown) as AttendanceEntry[];
  const totalSessions = attendanceEntries.length;
  const presentCount  = attendanceEntries.filter(e => e.status === "present").length;
  const absentCount   = totalSessions - presentCount;
  const percentage    = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : null;

  const displayName = studentProfile?.full_name ?? profile?.display_name ?? user.email ?? "Student";
  const rollNumber  = studentProfile?.roll_number ?? studentProfile?.login_id ?? null;

  // Compute percentage color
  const pctColor = percentage === null ? "#94a3b8"
    : percentage >= 75 ? "#16a34a"
    : percentage >= 50 ? "#d97706"
    : "#dc2626";

  return (
    <main className="page">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#2563eb,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: "1.3rem", flexShrink: 0 }}>
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="eyebrow">{institution?.name ?? "ClassPulse"}</p>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginTop: 2, marginBottom: 0 }}>
              {displayName}
            </h1>
            {rollNumber && (
              <p style={{ color: "#94a3b8", fontSize: ".82rem", marginTop: 2 }}>Student ID: {rollNumber}</p>
            )}
          </div>

          {/* Sign out */}
          <form action="/api/auth/signout" method="POST" style={{ marginLeft: "auto" }}>
            <button type="submit" style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 16px", cursor: "pointer", color: "#64748b", fontWeight: 600, fontSize: ".83rem" }}>
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 14, marginBottom: 28 }}>
        {/* Attendance % */}
        <div className="card" style={{ padding: "18px 20px", textAlign: "center" }}>
          <p style={{ fontSize: "2rem", fontWeight: 900, color: pctColor, lineHeight: 1 }}>
            {percentage !== null ? `${percentage}%` : "—"}
          </p>
          <p style={{ color: "#64748b", fontSize: ".78rem", fontWeight: 600, marginTop: 6 }}>Attendance rate</p>
          <p style={{ color: "#94a3b8", fontSize: ".7rem" }}>Last 60 days</p>
        </div>

        <div className="card" style={{ padding: "18px 20px", textAlign: "center" }}>
          <p style={{ fontSize: "2rem", fontWeight: 900, color: "#16a34a", lineHeight: 1 }}>{presentCount}</p>
          <p style={{ color: "#64748b", fontSize: ".78rem", fontWeight: 600, marginTop: 6 }}>Present</p>
          <p style={{ color: "#94a3b8", fontSize: ".7rem" }}>Last 60 days</p>
        </div>

        <div className="card" style={{ padding: "18px 20px", textAlign: "center" }}>
          <p style={{ fontSize: "2rem", fontWeight: 900, color: absentCount > 0 ? "#dc2626" : "#94a3b8", lineHeight: 1 }}>{absentCount}</p>
          <p style={{ color: "#64748b", fontSize: ".78rem", fontWeight: 600, marginTop: 6 }}>Absent</p>
          <p style={{ color: "#94a3b8", fontSize: ".7rem" }}>Last 60 days</p>
        </div>

        <div className="card" style={{ padding: "18px 20px", textAlign: "center" }}>
          <p style={{ fontSize: "2rem", fontWeight: 900, color: "#334155", lineHeight: 1 }}>{totalSessions}</p>
          <p style={{ color: "#64748b", fontSize: ".78rem", fontWeight: 600, marginTop: 6 }}>Sessions</p>
          <p style={{ color: "#94a3b8", fontSize: ".7rem" }}>Last 60 days</p>
        </div>
      </div>

      {/* Warning if attendance is low */}
      {percentage !== null && percentage < 75 && (
        <div style={{ background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 14, padding: "14px 18px", marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
          <div>
            <p style={{ fontWeight: 700, color: "#9a3412", marginBottom: 3 }}>Attendance below 75%</p>
            <p style={{ color: "#92400e", fontSize: ".83rem" }}>
              You have {percentage}% attendance in the last 60 days. Maintain at least 75% to avoid issues.
              Contact your class teacher if you have any concerns.
            </p>
          </div>
        </div>
      )}

      {/* Attendance history */}
      <h2 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: 14 }}>
        Recent sessions
      </h2>

      {attendanceEntries.length === 0 ? (
        <div className="card" style={{ padding: "40px 24px", textAlign: "center", border: "1.5px dashed #dbe3ef", background: "#fafbfd" }}>
          <span style={{ fontSize: 40 }}>📋</span>
          <h3 style={{ fontWeight: 700, marginTop: 12, marginBottom: 8 }}>No attendance records yet</h3>
          <p style={{ color: "#64748b", fontSize: ".88rem" }}>
            Your attendance will appear here once your teacher marks you present or absent.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {attendanceEntries.map(entry => {
            const lecture = entry.lectures;
            const date    = lecture?.started_at
              ? new Date(lecture.started_at).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })
              : new Date(entry.marked_at).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
            const time = lecture?.started_at
              ? new Date(lecture.started_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
              : "—";
            const subject = lecture?.courses?.name ?? lecture?.label ?? "Session";
            const batch   = lecture?.batches?.name ?? null;
            const isPresent = entry.status === "present";

            return (
              <div key={entry.id} className="card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                {/* Status pill */}
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: isPresent ? "#16a34a" : "#dc2626"
                }} />

                {/* Subject + batch */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: ".88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {subject}
                    {batch && <span style={{ marginLeft: 8, background: "#eef0ff", color: "#4f3ac9", borderRadius: 4, padding: "1px 6px", fontSize: ".7rem", fontWeight: 700 }}>{batch}</span>}
                  </p>
                  <p style={{ color: "#94a3b8", fontSize: ".75rem" }}>{date} · {time}</p>
                </div>

                {/* Status badge */}
                <span style={{
                  background: isPresent ? "#f0fdf4" : "#fef2f2",
                  color:      isPresent ? "#16a34a" : "#dc2626",
                  border:     `1px solid ${isPresent ? "#bbf7d0" : "#fecaca"}`,
                  borderRadius: 20, fontSize: ".72rem", fontWeight: 700, padding: "3px 10px",
                  flexShrink: 0
                }}>
                  {isPresent ? "Present" : "Absent"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {totalSessions > 0 && (
        <p style={{ color: "#94a3b8", fontSize: ".75rem", textAlign: "center", marginTop: 16 }}>
          Showing last 60 days · {totalSessions} session{totalSessions !== 1 ? "s" : ""} total
        </p>
      )}

      {/* Face photos section — F8 Student self-upload */}
      {profile?.institution_id && (
        <div className="card" style={{ padding: "20px 22px", marginTop: 28 }}>
          <StudentPhotoPanel
            photos={photos.map(p => ({
              id: p.id,
              image_path: p.image_path,
              school_locked: p.school_locked ?? false,
              uploaded_by_role: p.uploaded_by_role ?? null,
              signedUrl: signedUrlMap[p.image_path] ?? undefined,
            }))}
          />
        </div>
      )}
    </main>
  );
}
