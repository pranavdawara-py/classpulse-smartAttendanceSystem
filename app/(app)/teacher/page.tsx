import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function TeacherHomePage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch teacher display name
  const { data: teacher } = await supabase
    .from("teacher_profiles")
    .select("full_name")
    .eq("profile_id", user.id)
    .single();

  const name = teacher?.full_name ?? user.email ?? "Teacher";

  return (
    <div className="shell">
      {/* Nav */}
      <nav className="nav" style={{ padding: "0 20px" }}>
        <div style={{
          maxWidth: 1180, margin: "0 auto",
          height: 60, display: "flex", alignItems: "center", justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              width: 32, height: 32, borderRadius: 9,
              background: "linear-gradient(135deg,#6d4aff,#c849f4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16
            }}>⚡</span>
            <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#172033" }}>ClassPulse</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: ".85rem", color: "#64748b" }}>{name}</span>
            <form action="/api/auth/signout" method="POST">
              <button type="submit" style={{
                background: "none", border: "1px solid #e7edf5",
                borderRadius: 10, padding: "6px 14px", cursor: "pointer",
                fontSize: ".82rem", color: "#64748b", fontWeight: 600
              }}>Sign out</button>
            </form>
          </div>
        </div>
      </nav>

      <main className="page">
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <p className="eyebrow">Teacher dashboard</p>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginTop: 6, marginBottom: 8 }}>
            Good {getGreeting()}, {name.split(" ")[0]} 👋
          </h1>
          <p style={{ color: "#64748b", fontSize: ".95rem" }}>
            Record attendance with live camera or upload a class video.
          </p>
        </div>

        {/* Quick action */}
        <div className="card" style={{
          padding: "28px 28px",
          background: "linear-gradient(135deg,#6d4aff 0%,#8b5cf6 100%)",
          border: "none", marginBottom: 16
        }}>
          <p style={{ color: "rgba(255,255,255,.7)", fontSize: ".8rem", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 8 }}>
            Quick action
          </p>
          <h2 style={{ color: "white", fontSize: "1.2rem", fontWeight: 800, marginBottom: 16 }}>
            Record attendance
          </h2>
          <p style={{ color: "rgba(255,255,255,.75)", fontSize: ".9rem", marginBottom: 20 }}>
            Select a batch, scan the room with your camera or upload a video, then review and confirm.
          </p>
          <a
            href="/teacher/attendance/new"
            id="start-attendance-btn"
            style={{
              display: "inline-block",
              background: "white", color: "#6d4aff",
              border: "none", borderRadius: 12, padding: "12px 22px",
              fontWeight: 800, fontSize: ".95rem", textDecoration: "none"
            }}
          >
            📷 Start attendance
          </a>
        </div>

        {/* History quick-link */}
        <a href="/teacher/attendance/history" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", borderRadius: 14,
          background: "#fafbfd", border: "1.5px solid #e7edf5",
          textDecoration: "none", marginBottom: 28,
          transition: "border-color .15s"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>📋</span>
            <div>
              <p style={{ fontWeight: 700, color: "#172033", fontSize: ".9rem", marginBottom: 1 }}>View attendance history</p>
              <p style={{ color: "#64748b", fontSize: ".78rem" }}>All sessions · filter by date or batch</p>
            </div>
          </div>
          <span style={{ color: "#94a3b8", fontSize: 18 }}>→</span>
        </a>

        {/* Tips */}
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: 12 }}>How it works</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
            {[
              { icon: "📷", step: "1", title: "Open camera", body: "Use live camera or upload a class recording" },
              { icon: "🤖", step: "2", title: "AI scans faces", body: "Faces recognised automatically; unknowns flagged" },
              { icon: "✅", step: "3", title: "Review & confirm", body: "Correct any mistakes, then save to cloud" },
            ].map(t => (
              <div key={t.step} className="card" style={{ padding: "16px", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{t.icon}</div>
                <p style={{ fontWeight: 800, fontSize: ".83rem", marginBottom: 4 }}>{t.title}</p>
                <p style={{ color: "#64748b", fontSize: ".73rem", lineHeight: 1.4 }}>{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function EmptyState({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="card" style={{
      padding: "36px 24px", textAlign: "center",
      border: "1.5px dashed #dbe3ef", background: "#fafbfd"
    }}>
      <span style={{ fontSize: 40 }}>{icon}</span>
      <h3 style={{ fontWeight: 700, marginTop: 12, marginBottom: 8, fontSize: "1rem" }}>{title}</h3>
      <p style={{ color: "#64748b", fontSize: ".88rem", maxWidth: 340, margin: "0 auto" }}>{body}</p>
    </div>
  );
}
