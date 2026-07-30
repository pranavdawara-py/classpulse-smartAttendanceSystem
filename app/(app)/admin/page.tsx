import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminHomePage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <main className="page">
      <div style={{ marginBottom: 32 }}>
        <p className="eyebrow">School administration</p>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginTop: 6, marginBottom: 8 }}>
          Set up your school
        </h1>
        <p style={{ color: "#64748b", fontSize: ".95rem" }}>
          Complete these steps to get your school up and running on ClassPulse.
        </p>
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>
        <SetupCard
          icon="🏫" step="1" title="Institution profile"
          body="Your school name and location were set up during registration."
          status="done" href={null}
        />
        <SetupCard
          icon="👩‍🏫" step="2" title="Teacher accounts"
          body="Invite teachers by email. They set their own passwords and can log in immediately."
          status="active" href="/admin/teachers"
        />
        <SetupCard
          icon="🎓" step="3" title="Students & groups"
          body="Add student records, create batches or sections, and assign students."
          status="active" href="/admin/students"
        />
        <SetupCard
          icon="📅" step="4" title="Schedule & timetable"
          body="Define your weekly timetable. Teachers can also mark attendance without a schedule."
          status="coming-soon" href={null}
        />
        <SetupCard
          icon="📸" step="5" title="Student face photos"
          body="Students upload their photos via their account. School-uploaded photos are locked and protected."
          status="active" href="/admin/students"
        />
        <SetupCard
          icon="📊" step="6" title="Attendance history"
          body="Teachers view attendance records, download CSVs, and review corrections."
          status="active" href="/teacher/attendance/history"
        />
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
    <div className="card" style={{ padding: "24px 22px", opacity: status === "coming-soon" ? .65 : 1, height: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 28 }}>{icon}</span>
        <span style={{ ...badge, borderRadius: 6, padding: "2px 9px", fontSize: ".72rem", fontWeight: 700 }}>
          {badge.label}
        </span>
      </div>
      <p style={{ color: "#6d4aff", fontSize: ".72rem", fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 4 }}>
        Step {step}
      </p>
      <h3 style={{ fontWeight: 800, fontSize: "1rem", marginBottom: 6 }}>{title}</h3>
      <p style={{ color: "#64748b", fontSize: ".87rem", lineHeight: 1.5 }}>{body}</p>
    </div>
  );

  if (href && status === "active") {
    return (
      <Link href={href} style={{ textDecoration: "none", display: "block" }}>
        {inner}
      </Link>
    );
  }
  return inner;
}
