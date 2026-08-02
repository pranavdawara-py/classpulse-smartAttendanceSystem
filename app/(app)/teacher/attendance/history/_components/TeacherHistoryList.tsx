"use client";

import { useState } from "react";

interface AttendanceEntry {
  id: string;
  status: "present" | "absent";
  manually_changed: boolean;
  student_name?: string | null;
  roll_number?: string | null;
}

interface Lecture {
  id: string;
  label: string | null;
  scheduled_starts_at: string;
  teacher_profiles: { full_name: string } | null;
  batches: { name: string } | null;
}

interface Session {
  id: string;
  input_mode: string;
  status: string;
  confirmed_at: string | null;
  started_at?: string | null;
  lectures: Lecture | null;
  attendance_entries: AttendanceEntry[];
}

interface Props {
  sessions: Session[];
}

function downloadSessionCSV(session: Session) {
  const label = session.lectures?.label || session.lectures?.batches?.name || "attendance";
  const dateStr = session.confirmed_at ?? session.started_at ?? new Date().toISOString();
  const date = new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const rows = [
    ["#", "Student Name", "Roll No.", "Status", "Manual Override"],
    ...session.attendance_entries.map((e, i) => [
      String(i + 1),
      e.student_name ?? `Student ${i + 1}`,
      e.roll_number ?? "",
      e.status,
      e.manually_changed ? "Yes" : "No"
    ])
  ];
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${label}-${date}.csv`.replace(/\s+/g, "-");
  a.click();
  URL.revokeObjectURL(url);
}

export default function TeacherHistoryList({ sessions }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "camera" | "manual">("all");

  const filtered = filter === "all"
    ? sessions
    : sessions.filter(s => {
        if (filter === "camera") return s.input_mode === "live_camera" || s.input_mode === "uploaded_video";
        return s.input_mode === "manual";
      });

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (sessions.length === 0) {
    return (
      <div style={{ padding: "56px 24px", textAlign: "center", background: "#fafbfd", borderRadius: 20, border: "1.5px dashed #dbe3ef" }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>📋</div>
        <h2 style={{ fontWeight: 800, marginBottom: 8 }}>No sessions recorded yet</h2>
        <p style={{ color: "#64748b", maxWidth: 340, margin: "0 auto 20px" }}>
          Take your first attendance session and it will appear here with full history.
        </p>
        <a href="/teacher/attendance/new" style={{ display: "inline-block", padding: "12px 22px", background: "linear-gradient(135deg,#6d4aff,#8b5cf6)", color: "white", borderRadius: 12, fontWeight: 800, textDecoration: "none" }}>
          📷 Take attendance →
        </a>
      </div>
    );
  }

  const inputModeLabel = (mode: string) => {
    if (mode === "live_camera") return "📷 Camera";
    if (mode === "uploaded_video") return "🎬 Video";
    return "✏️ Manual";
  };

  return (
    <div>
      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {(["all", "camera", "manual"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "6px 16px", borderRadius: 20, border: "1.5px solid",
            borderColor: filter === f ? "#6d4aff" : "#dbe3ef",
            background: filter === f ? "#f5f3ff" : "white",
            color: filter === f ? "#6d4aff" : "#64748b",
            fontWeight: 700, fontSize: ".78rem", cursor: "pointer"
          }}>
            {f === "all" ? "All sessions" : f === "camera" ? "📷 Camera" : "✏️ Manual"}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(session => {
          const entries = session.attendance_entries ?? [];
          const presentN = entries.filter(e => e.status === "present").length;
          const absentN  = entries.filter(e => e.status === "absent").length;
          const total    = entries.length;
          const pct      = total > 0 ? Math.round((presentN / total) * 100) : 0;
          const isOpen   = expanded.has(session.id);
          const lec      = session.lectures;
          const sessionDate = new Date(session.confirmed_at ?? session.started_at ?? Date.now());
          const isValidDate = !isNaN(sessionDate.getTime());

          return (
            <div key={session.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <button onClick={() => toggle(session.id)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 14,
                padding: "16px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left"
              }}>
                {/* Donut */}
                <div style={{
                  width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                  background: `conic-gradient(#6d4aff 0% ${pct}%, #f1f5f9 ${pct}% 100%)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "inset 0 0 0 8px white"
                }}>
                  <span style={{ fontSize: ".65rem", fontWeight: 800, color: "#6d4aff" }}>{pct}%</span>
                </div>

                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 800, fontSize: ".95rem", marginBottom: 2 }}>
                    {lec?.label || "Attendance session"}
                    {lec?.batches?.name && (
                      <span style={{ marginLeft: 8, fontSize: ".72rem", fontWeight: 700, background: "#f5f3ff", color: "#6d4aff", borderRadius: 6, padding: "2px 7px" }}>
                        {lec.batches.name}
                      </span>
                    )}
                  </p>
                  <p style={{ color: "#64748b", fontSize: ".78rem" }}>
                    {isValidDate
                      ? sessionDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) + " · " + sessionDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                      : "Date unknown"}
                    <span style={{ marginLeft: 8, opacity: .7 }}>{inputModeLabel(session.input_mode)}</span>
                  </p>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: ".83rem", color: "#22c55e" }}>{presentN}P</span>
                  <span style={{ fontWeight: 700, fontSize: ".83rem", color: "#dc2626" }}>{absentN}A</span>
                  <span style={{ fontSize: 18, color: "#94a3b8", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}>⌄</span>
                </div>
              </button>

              {isOpen && (
                <div style={{ borderTop: "1px solid #f1f5f9", padding: "12px 18px 16px" }}>
                  <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                    <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "8px 14px", textAlign: "center", minWidth: 80 }}>
                      <p style={{ fontSize: "1.3rem", fontWeight: 800, color: "#16a34a" }}>{presentN}</p>
                      <p style={{ fontSize: ".72rem", color: "#166534", fontWeight: 700 }}>Present</p>
                    </div>
                    <div style={{ background: "#fef2f2", borderRadius: 10, padding: "8px 14px", textAlign: "center", minWidth: 80 }}>
                      <p style={{ fontSize: "1.3rem", fontWeight: 800, color: "#dc2626" }}>{absentN}</p>
                      <p style={{ fontSize: ".72rem", color: "#991b1b", fontWeight: 700 }}>Absent</p>
                    </div>
                    <div style={{ background: "#f8fafc", borderRadius: 10, padding: "8px 14px", textAlign: "center", minWidth: 80 }}>
                      <p style={{ fontSize: "1.3rem", fontWeight: 800, color: "#475569" }}>{total}</p>
                      <p style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 700 }}>Total</p>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadSessionCSV(session)}
                    style={{ fontSize: ".75rem", fontWeight: 700, color: "#6d4aff", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 8, padding: "5px 12px", cursor: "pointer" }}
                  >
                    ⬇ Download CSV
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
