import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminHomePage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch institution name
  const { data: profile } = await supabase
    .from("profiles")
    .select("institution_id, role")
    .eq("id", user.id)
    .single();

  // Only admins should reach this page; middleware + layout guard it,
  // but double-check here for defence in depth.
  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

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
            <span style={{
              marginLeft: 6, background: "#eef0ff", color: "#4f3ac9",
              borderRadius: 6, padding: "2px 8px",
              fontSize: ".73rem", fontWeight: 700
            }}>Admin</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: ".85rem", color: "#64748b" }}>{user.email}</span>
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
        <div style={{ marginBottom: 32 }}>
          <p className="eyebrow">School administration</p>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginTop: 6, marginBottom: 8 }}>
            Institution setup
          </h1>
          <p style={{ color: "#64748b", fontSize: ".95rem" }}>
            Configure your school, add staff, enrol students, and manage schedules.
          </p>
        </div>

        {/* Setup checklist */}
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>
          <SetupCard
            icon="🏫"
            step="1"
            title="Institution profile"
            body="Set your school name, timezone, and basic configuration."
            status="coming-soon"
          />
          <SetupCard
            icon="👩‍🏫"
            step="2"
            title="Teacher accounts"
            body="Create teacher accounts and assign them to subjects and batches."
            status="coming-soon"
          />
          <SetupCard
            icon="🎓"
            step="3"
            title="Students & groups"
            body="Add student records, create batches or sections, manage memberships."
            status="coming-soon"
          />
          <SetupCard
            icon="📅"
            step="4"
            title="Schedule & lectures"
            body="Define the weekly timetable, add extra classes, and handle cancellations."
            status="coming-soon"
          />
          <SetupCard
            icon="📸"
            step="5"
            title="Face enrolment"
            body="Students submit three or more approved photos before recognition is enabled."
            status="coming-soon"
          />
          <SetupCard
            icon="📊"
            step="6"
            title="Attendance history"
            body="View confirmed attendance records, audit corrections, and export reports."
            status="coming-soon"
          />
        </div>
      </main>
    </div>
  );
}

function SetupCard({
  icon, step, title, body, status
}: {
  icon: string;
  step: string;
  title: string;
  body: string;
  status: "done" | "active" | "coming-soon";
}) {
  const statusStyle =
    status === "done"
      ? { background: "#ecfdf5", color: "#065f46", label: "Done ✓" }
      : status === "active"
      ? { background: "#eff6ff", color: "#1d4ed8", label: "In progress" }
      : { background: "#f8fafc", color: "#64748b", label: "Coming soon" };

  return (
    <div className="card" style={{ padding: "24px 22px", opacity: status === "coming-soon" ? .7 : 1 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 28 }}>{icon}</span>
        <span style={{
          ...statusStyle,
          borderRadius: 6, padding: "2px 8px",
          fontSize: ".72rem", fontWeight: 700
        }}>{statusStyle.label}</span>
      </div>
      <p style={{ color: "#6d4aff", fontSize: ".72rem", fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 4 }}>
        Step {step}
      </p>
      <h3 style={{ fontWeight: 800, fontSize: "1rem", marginBottom: 6 }}>{title}</h3>
      <p style={{ color: "#64748b", fontSize: ".87rem", lineHeight: 1.5 }}>{body}</p>
    </div>
  );
}
