"use client";

import { useState } from "react";
import type { StandaloneSessionSummary } from "@/app/actions/standalone/attendance";

interface Props {
  sessions: StandaloneSessionSummary[];
}

function downloadSessionCSV(session: StandaloneSessionSummary) {
  const label = session.label || "attendance";
  const date = new Date(session.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const rows = [
    ["Name", "Roll Number", "Status", "Detection Source"],
    ...session.entries.map(e => [
      e.student_name,
      e.roll_number ?? "",
      e.status,
      e.detection_source,
    ])
  ];
  const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${label}-${date}.csv`.replace(/\s+/g, "-");
  a.click();
  URL.revokeObjectURL(url);
}

export default function SessionHistoryList({ sessions }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [subjectFilter, setSubjectFilter] = useState<string>("all");

  // Collect unique subjects
  const subjects = Array.from(new Set(
    sessions.map(s => s.subject).filter(Boolean) as string[]
  )).sort();

  const filtered = subjectFilter === "all"
    ? sessions
    : sessions.filter(s => s.subject === subjectFilter);

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
        <h2 style={{ fontWeight: 800, marginBottom: 8 }}>No history yet</h2>
        <p style={{ color: "#64748b", maxWidth: 320, margin: "0 auto 20px" }}>
          Complete your first attendance session from the roster and it will appear here.
        </p>
        <a href="/attend" style={{ display: "inline-block", padding: "12px 22px", background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "white", borderRadius: 12, fontWeight: 800, textDecoration: "none" }}>
          Go to roster →
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Subject filter */}
      {subjects.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {["all", ...subjects].map(s => (
            <button
              key={s}
              onClick={() => setSubjectFilter(s)}
              style={{
                padding: "6px 14px", borderRadius: 20, border: "1.5px solid",
                borderColor: subjectFilter === s ? "#f59e0b" : "#dbe3ef",
                background: subjectFilter === s ? "#fef3c7" : "white",
                color: subjectFilter === s ? "#92400e" : "#64748b",
                fontWeight: 700, fontSize: ".78rem", cursor: "pointer"
              }}
            >
              {s === "all" ? "All subjects" : s}
            </button>
          ))}
        </div>
      )}

      {/* Session cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map(session => {
          const presentN = session.entries.filter(e => e.status === "present").length;
          const absentN  = session.entries.filter(e => e.status === "absent").length;
          const total    = session.entries.length;
          const pct      = total > 0 ? Math.round((presentN / total) * 100) : 0;
          const isOpen   = expanded.has(session.id);
          const date     = new Date(session.created_at);
          const cameraCount = session.entries.filter(e => e.detection_source === "camera").length;

          return (
            <div key={session.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
              {/* Header row */}
              <button
                onClick={() => toggle(session.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 14,
                  padding: "16px 18px", background: "none", border: "none",
                  cursor: "pointer", textAlign: "left"
                }}
              >
                {/* Attendance donut indicator */}
                <div style={{
                  width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                  background: `conic-gradient(#22c55e 0% ${pct}%, #f1f5f9 ${pct}% 100%)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "inset 0 0 0 8px white"
                }}>
                  <span style={{ fontSize: ".65rem", fontWeight: 800, color: pct > 60 ? "#16a34a" : "#dc2626" }}>{pct}%</span>
                </div>

                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 800, fontSize: ".95rem", marginBottom: 2 }}>
                    {session.label || "Untitled session"}
                    {session.subject && (
                      <span style={{ marginLeft: 8, fontSize: ".72rem", fontWeight: 700, background: "#fef3c7", color: "#92400e", borderRadius: 6, padding: "2px 7px" }}>
                        {session.subject}
                      </span>
                    )}
                  </p>
                  <p style={{ color: "#64748b", fontSize: ".78rem" }}>
                    {date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                    {" · "}{date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    {cameraCount > 0 && <span style={{ marginLeft: 8, opacity: .7 }}>📷 {cameraCount} camera</span>}
                  </p>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: ".83rem", color: "#16a34a" }}>{presentN}P</span>
                  <span style={{ fontWeight: 700, fontSize: ".83rem", color: "#dc2626" }}>{absentN}A</span>
                  <span style={{ fontSize: 18, color: "#94a3b8", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}>⌄</span>
                </div>
              </button>

              {/* Expanded entry list */}
              {isOpen && (
                <div style={{ borderTop: "1px solid #f1f5f9", padding: "0 18px 16px" }}>
                  {/* Download button */}
                  <button
                    onClick={() => downloadSessionCSV(session)}
                    style={{ marginTop: 12, marginBottom: 10, fontSize: ".75rem", fontWeight: 700, color: "#6d4aff", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 8, padding: "5px 12px", cursor: "pointer" }}
                  >
                    ⬇ Download CSV
                  </button>
                  <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                    {session.entries.map(entry => (
                      <div key={entry.id} style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "7px 10px",
                        borderRadius: 10, background: entry.status === "present" ? "#f0fdf4" : "#fafbfd",
                        fontSize: ".83rem"
                      }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                          background: entry.status === "present" ? "#22c55e" : "#e2e8f0"
                        }} />
                        <span style={{ flex: 1, fontWeight: 600 }}>
                          {entry.student_name}
                          {entry.roll_number && <span style={{ color: "#94a3b8", marginLeft: 4 }}>#{entry.roll_number}</span>}
                        </span>
                        {entry.detection_source === "camera" && entry.confidence && (
                          <span style={{ fontSize: ".7rem", color: "#6d4aff", fontWeight: 700 }}>
                            📷 {Math.round(entry.confidence * 100)}%
                          </span>
                        )}
                        <span style={{ fontWeight: 700, color: entry.status === "present" ? "#16a34a" : "#94a3b8" }}>
                          {entry.status === "present" ? "✓" : "–"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
