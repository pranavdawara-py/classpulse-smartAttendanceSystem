"use client";

import { useState, useActionState, useCallback } from "react";
import { saveStandaloneSession, type StandaloneSaveState, type StandaloneAttendanceEntry } from "@/app/actions/standalone/attendance";
import CameraAttendance from "./CameraAttendance";

interface Photo { id: string; object_path: string }
interface Student {
  id: string; name: string; roll_number: string | null;
  standalone_student_photos: Photo[];
}

interface Props {
  students: Student[];
  photoUrls: Record<string, string>;
  /** User's UUID — used as session_id for tenant-isolated backend matching. */
  sessionId: string;
  onCancel: () => void;
}

type Step = "setup" | "mark" | "confirm";

function downloadCSV(label: string, students: { name: string; roll_number: string | null; status: "present" | "absent" }[]) {
  const date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const rows = [
    [`Session: ${label || "Attendance"}`],
    [`Date: ${date}`],
    [],
    ["Name", "Roll Number", "Status"],
    ...students.map(s => [s.name, s.roll_number ?? "", s.status === "present" ? "Present" : "Absent"])
  ];
  const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `${(label || "attendance").replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function StandaloneAttendanceWizard({ students, photoUrls, sessionId, onCancel }: Props) {
  const [step, setStep]     = useState<Step>("setup");
  const [label, setLabel]   = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(students.map(s => s.id)));
  const [attendance, setAttendance] = useState<Record<string, "present" | "absent">>({});
  const [csvSaved, setCsvSaved] = useState(false);
  const [markTab, setMarkTab] = useState<"camera" | "manual">("camera");

  const [saveState, saveAction, saving] =
    useActionState<StandaloneSaveState, FormData>(saveStandaloneSession, null);

  const includedStudents = students.filter(s => selected.has(s.id));

  // ── Success screen ────────────────────────────────────────────────────────
  if (saveState?.success) {
    const presentN = Object.values(attendance).filter(v => v === "present").length;
    const absentN  = includedStudents.length - presentN;
    return (
      <div className="card" style={{ padding: "48px 28px", textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontWeight: 800, fontSize: "1.3rem", marginBottom: 8 }}>Session saved!</h2>
        <p style={{ color: "#78716c", marginBottom: 28 }}>
          {presentN} present · {absentN} absent
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="action action-secondary" onClick={onCancel} style={{ minHeight: 44 }}>
            ← Back to roster
          </button>
          {!csvSaved && (
            <button className="action action-secondary" style={{ minHeight: 44 }}
              onClick={() => {
                downloadCSV(label, includedStudents.map(s => ({ ...s, status: attendance[s.id] ?? "absent" })));
                setCsvSaved(true);
              }}>
              💾 Download CSV too
            </button>
          )}
          <button className="action" onClick={() => {
            setStep("setup"); setLabel(""); setAttendance({});
            setSelected(new Set(students.map(s => s.id))); setCsvSaved(false);
          }} style={{ minHeight: 44, background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
            + New session
          </button>
        </div>
      </div>
    );
  }

  // ── STEP 1: Setup ─────────────────────────────────────────────────────────
  if (step === "setup") {
    return (
      <div>
        <button onClick={onCancel} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#78716c", fontWeight: 700, fontSize: ".85rem", marginBottom: 20 }}>
          ← Back to roster
        </button>
        <StepIndicator current={1} />

        <div className="card" style={{ padding: "24px 22px" }}>
          <h2 style={{ fontWeight: 800, fontSize: "1.05rem", marginBottom: 18 }}>Session setup</h2>

          <div className="field" style={{ marginBottom: 18 }}>
            <label htmlFor="sa-label">Session name <span style={{ color: "#94a3b8", fontWeight: 500 }}>(optional)</span></label>
            <input id="sa-label" type="text" value={label} onChange={e => setLabel(e.target.value)}
              placeholder={`e.g. Chemistry · ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`} />
          </div>

          <div style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <label style={{ fontWeight: 700, fontSize: ".88rem", color: "#334155" }}>
                Students ({selected.size} / {students.length} selected)
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setSelected(new Set(students.map(s => s.id)))} style={{ fontSize: ".72rem", fontWeight: 700, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}>All</button>
                <button onClick={() => setSelected(new Set())} style={{ fontSize: ".72rem", fontWeight: 700, background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}>None</button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {students.map(s => {
                const checked = selected.has(s.id);
                const photoUrl = s.standalone_student_photos[0] ? photoUrls[s.standalone_student_photos[0].object_path] : null;
                return (
                  <div key={s.id} onClick={() => setSelected(prev => {
                    const next = new Set(prev);
                    checked ? next.delete(s.id) : next.add(s.id);
                    return next;
                  })} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 13px",
                    borderRadius: 12, border: `1.5px solid ${checked ? "#fcd34d" : "#e2e8f0"}`,
                    background: checked ? "#fffbeb" : "#fafbfd", cursor: "pointer"
                  }}>
                    <input type="checkbox" checked={checked} readOnly style={{ accentColor: "#f59e0b", width: 16, height: 16 }} />
                    {photoUrl ? (
                      <img src={photoUrl} alt={s.name} style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: "2px solid #fcd34d", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#fbbf24,#f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: ".75rem", flexShrink: 0 }}>
                        {s.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span style={{ fontWeight: 600, fontSize: ".9rem" }}>{s.name}</span>
                    {s.roll_number && <span style={{ color: "#94a3b8", fontSize: ".75rem" }}>#{s.roll_number}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <button className="action" disabled={selected.size === 0}
          onClick={() => {
            const init: Record<string, "present" | "absent"> = {};
            includedStudents.forEach(s => { init[s.id] = "absent"; });
            setAttendance(init);
            setStep("mark");
          }}
          style={{ width: "100%", marginTop: 16, minHeight: 50, background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
          Continue with {selected.size} student{selected.size !== 1 ? "s" : ""} →
        </button>
      </div>
    );
  }

  // ── STEP 2: Mark ─────────────────────────────────────────────────────────
  if (step === "mark") {
    const presentCount = Object.values(attendance).filter(v => v === "present").length;

    // Transform students for CameraAttendance (needs photo_urls array)
    const cameraStudents = includedStudents.map(s => ({
      id: s.id,
      name: s.name,
      photo_urls: s.standalone_student_photos
        .map(p => photoUrls[p.object_path])
        .filter(Boolean) as string[],
    }));

    const hasPhotos = cameraStudents.some(s => s.photo_urls.length > 0);

    return (
      <div>
        <StepIndicator current={2} />

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 0, marginBottom: 16, background: "#f1f5f9", borderRadius: 14, padding: 4 }}>
          {(["camera", "manual"] as const).map(tab => (
            <button key={tab} onClick={() => setMarkTab(tab)} style={{
              flex: 1, padding: "9px 0", borderRadius: 11, border: "none",
              fontWeight: 700, fontSize: ".85rem", cursor: "pointer",
              background: markTab === tab ? "linear-gradient(135deg,#6d4aff,#8b5cf6)" : "transparent",
              color: markTab === tab ? "white" : "#64748b",
              transition: "all .18s"
            }}>
              {tab === "camera" ? "📷 Camera scan" : "✏️ Manual"}
            </button>
          ))}
        </div>

        {/* ── Camera tab ── */}
        {markTab === "camera" && (
          <div>
            {!hasPhotos && (
              <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 14, padding: "14px 18px", marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontSize: 20 }}>⚠️</span>
                <div>
                  <p style={{ fontWeight: 700, fontSize: ".88rem", color: "#9a3412", marginBottom: 2 }}>No photos uploaded</p>
                  <p style={{ color: "#78716c", fontSize: ".8rem" }}>Upload at least 1 photo per student for camera recognition to work. Switch to Manual to proceed without photos.</p>
                </div>
              </div>
            )}
            <CameraAttendance
              students={cameraStudents}
              sessionId={sessionId}
              onAttendanceChange={(updated) => setAttendance(prev => ({ ...prev, ...updated }))}
              onDone={() => setStep("confirm")}
            />
          </div>
        )}

        {/* ── Manual tab ── */}
        {markTab === "manual" && (
          <div className="card" style={{ padding: "20px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ fontWeight: 800, fontSize: ".95rem" }}>{presentCount} / {includedStudents.length} present</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setAttendance(Object.fromEntries(includedStudents.map(s => [s.id, "present" as const])))}
                  style={{ fontSize: ".72rem", fontWeight: 700, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>All present</button>
                <button onClick={() => setAttendance(Object.fromEntries(includedStudents.map(s => [s.id, "absent" as const])))}
                  style={{ fontSize: ".72rem", fontWeight: 700, background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>All absent</button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {includedStudents.map(s => {
                const present = attendance[s.id] === "present";
                const photoUrl = s.standalone_student_photos[0] ? photoUrls[s.standalone_student_photos[0].object_path] : null;
                return (
                  <div key={s.id} onClick={() => setAttendance(prev => ({ ...prev, [s.id]: present ? "absent" : "present" }))}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 13px", borderRadius: 12, border: `1.5px solid ${present ? "#86efac" : "#e2e8f0"}`, background: present ? "#f0fdf4" : "#fafbfd", cursor: "pointer" }}>
                    {photoUrl
                      ? <img src={photoUrl} alt={s.name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid #fcd34d", flexShrink: 0 }} />
                      : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#fbbf24,#f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: ".75rem", flexShrink: 0 }}>{s.name.slice(0, 2).toUpperCase()}</div>
                    }
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: ".88rem" }}>{s.name}</p>
                      {s.roll_number && <p style={{ color: "#94a3b8", fontSize: ".72rem" }}>#{s.roll_number}</p>}
                    </div>
                    <span style={{ padding: "5px 14px", borderRadius: 20, fontWeight: 700, fontSize: ".78rem", background: present ? "#22c55e" : "#f1f5f9", color: present ? "white" : "#64748b", border: `1.5px solid ${present ? "#16a34a" : "#cbd5e1"}` }}>
                      {present ? "✓ Present" : "Absent"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <button className="action action-secondary" onClick={() => setStep("setup")} style={{ flex: "0 0 auto", minHeight: 50 }}>← Back</button>
          <button className="action" onClick={() => setStep("confirm")}
            style={{ flex: 1, minHeight: 50, background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
            Review & save →
          </button>
        </div>
      </div>
    );
  }

  // ── STEP 3: Confirm ────────────────────────────────────────────────────────
  const presentCount = Object.values(attendance).filter(v => v === "present").length;
  const absentCount  = includedStudents.length - presentCount;
  const entries: StandaloneAttendanceEntry[] = includedStudents.map(s => ({
    studentId:  s.id,
    name:       s.name,
    rollNumber: s.roll_number,
    status:     attendance[s.id] ?? "absent",
  }));

  return (
    <div>
      <StepIndicator current={3} />

      <div className="card" style={{ padding: "22px 24px", marginBottom: 16 }}>
        <h2 style={{ fontWeight: 800, marginBottom: 14 }}>
          {label || "Attendance session"} · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div style={{ background: "#f0fdf4", borderRadius: 14, padding: "14px", textAlign: "center" }}>
            <p style={{ fontSize: "1.75rem", fontWeight: 800, color: "#16a34a" }}>{presentCount}</p>
            <p style={{ color: "#166534", fontSize: ".78rem", fontWeight: 700 }}>Present</p>
          </div>
          <div style={{ background: "#fef2f2", borderRadius: 14, padding: "14px", textAlign: "center" }}>
            <p style={{ fontSize: "1.75rem", fontWeight: 800, color: "#dc2626" }}>{absentCount}</p>
            <p style={{ color: "#991b1b", fontSize: ".78rem", fontWeight: 700 }}>Absent</p>
          </div>
        </div>
        <div style={{ maxHeight: 180, overflowY: "auto", borderRadius: 10, border: "1px solid #e7edf5" }}>
          {includedStudents.map((s, i) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 12px", borderBottom: i < includedStudents.length - 1 ? "1px solid #f1f5f9" : "none", fontSize: ".83rem" }}>
              <span>{i + 1}. {s.name}{s.roll_number ? ` (#${s.roll_number})` : ""}</span>
              <span style={{ fontWeight: 700, color: attendance[s.id] === "present" ? "#16a34a" : "#dc2626" }}>
                {attendance[s.id] === "present" ? "Present" : "Absent"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {saveState?.error && (
        <div className="alert alert-error" style={{ marginBottom: 14 }}>{saveState.error}</div>
      )}

      {/* Save options */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
        <button onClick={() => { downloadCSV(label, includedStudents.map(s => ({ ...s, status: attendance[s.id] ?? "absent" }))); setCsvSaved(true); }}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderRadius: 14, border: "1.5px solid #dbe3ef", background: "#fff", cursor: "pointer", textAlign: "left" }}>
          <span style={{ fontSize: 24 }}>💾</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: ".88rem", marginBottom: 1 }}>Download as CSV {csvSaved && "✓"}</p>
            <p style={{ color: "#64748b", fontSize: ".75rem" }}>Save to your device right now</p>
          </div>
        </button>

        <form action={saveAction}>
          <input type="hidden" name="label"   value={label} />
          <input type="hidden" name="entries" value={JSON.stringify(entries)} />
          <button type="submit" disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderRadius: 14, border: "1.5px solid #fcd34d", background: "linear-gradient(135deg,#fef3c7,#fef9c3)", cursor: "pointer", width: "100%", textAlign: "left", opacity: saving ? .7 : 1 }}>
            <span style={{ fontSize: 24 }}>☁️</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: ".88rem", marginBottom: 1 }}>
                {saving ? "Saving to account…" : "Save to my ClassPulse account"}
              </p>
              <p style={{ color: "#92400e", fontSize: ".75rem" }}>Saved to your personal account</p>
            </div>
          </button>
        </form>
      </div>

      <button className="action action-secondary" onClick={() => setStep("mark")} style={{ width: "100%", minHeight: 44 }}>
        ← Edit attendance
      </button>
    </div>
  );
}

function StepIndicator({ current }: { current: number }) {
  const steps = ["Select students", "Mark attendance", "Review & save"];
  return (
    <div style={{ display: "flex", marginBottom: 24 }}>
      {steps.map((label, i) => {
        const n = i + 1; const active = n === current; const done = n < current;
        return (
          <div key={n} style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", fontWeight: 800, fontSize: ".8rem",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: done ? "#22c55e" : active ? "#f59e0b" : "#e2e8f0",
                color: done || active ? "white" : "#94a3b8"
              }}>{done ? "✓" : n}</div>
              <span style={{ fontSize: ".68rem", fontWeight: 700, color: active ? "#92400e" : "#94a3b8", whiteSpace: "nowrap" }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ height: 2, flex: 1, background: done ? "#22c55e" : "#e2e8f0", margin: "0 4px", marginTop: -20 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
