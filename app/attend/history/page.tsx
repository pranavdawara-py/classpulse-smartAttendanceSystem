import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listStandaloneSessions } from "@/app/actions/standalone/attendance";
import SessionHistoryList from "./_components/SessionHistoryList";

export const metadata = {
  title: "Attendance History — ClassPulse Personal",
  description: "View all past attendance sessions from your Personal Mode roster.",
};

export default async function AttendHistoryPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/attend");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/attend");

  const sessions = await listStandaloneSessions();

  return (
    <div className="shell">
      <nav className="nav" style={{ padding: "0 20px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/attend" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚡</span>
            <span style={{ fontWeight: 800, color: "#172033" }}>ClassPulse</span>
          </a>
          <a href="/attend" style={{ fontSize: ".83rem", color: "#64748b", fontWeight: 600, textDecoration: "none" }}>
            ← Back to roster
          </a>
        </div>
      </nav>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px 80px" }}>
        <div style={{ marginBottom: 28 }}>
          <p className="eyebrow">Personal Mode</p>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: 6, marginBottom: 8 }}>
            Attendance history
          </h1>
          <p style={{ color: "#64748b", fontSize: ".93rem" }}>
            {sessions.length === 0
              ? "No sessions recorded yet."
              : `${sessions.length} session${sessions.length !== 1 ? "s" : ""} recorded.`}
          </p>
        </div>

        <SessionHistoryList sessions={sessions} />
      </main>
    </div>
  );
}
