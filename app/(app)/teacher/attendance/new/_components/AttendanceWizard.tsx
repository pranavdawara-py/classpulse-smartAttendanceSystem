"use client";

import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  saveAttendanceSession,
  type AttendanceRecord,
  type SaveAttendanceState
} from "@/app/actions/teacher/attendance";
import CameraAttendance from "@/app/attend/_components/CameraAttendance";

interface Batch    { id: string; name: string }
interface Student  { profile_id: string; full_name: string; roll_number: string | null; batch_memberships: { batch_id: string }[] }

interface Props {
  batches: Batch[];
  students: Student[];
  /** Institution UUID — used as session_id for tenant-isolated backend matching. */
  institutionId: string;
  /** Signed photo URLs per student_id for face enrolment. */
  photoUrls?: Record<string, string[]>;
}

type Step = "setup" | "mark" | "confirm";

export default function AttendanceWizard({ batches, students, institutionId, photoUrls = {} }: Props) {
  const router = useRouter();

  // ── Step state ────────────────────────────────────────────────────────────
  const [step, setStep]           = useState<Step>("setup");
  const [label, setLabel]         = useState("");
  const [batchId, setBatchId]     = useState<string>("");
  const [inputMode, setInputMode] = useState<"live_camera" | "uploaded_video">("live_camera");
  const [markTab, setMarkTab]     = useState<"camera" | "manual">("camera");

  // Filtered student list based on batch selection
  const filtered = batchId
    ? students.filter(s => s.batch_memberships.some(m => m.batch_id === batchId))
    : students;

  // Attendance status map: studentId → "present" | "absent"
  const [attendance, setAttendance] = useState<Record<string, "present" | "absent">>({});

  function initAttendance(list: Student[]) {
    const init: Record<string, "present" | "absent"> = {};
    list.forEach(s => { init[s.profile_id] = "absent"; });
    setAttendance(init);
  }

  // ── Save action ───────────────────────────────────────────────────────────
  const [saveState, saveAction, saving] =
    useActionState<SaveAttendanceState, FormData>(saveAttendanceSession, null);

  if (saveState?.success) {
    return (
      <div className="card" style={{ padding: "48px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontWeight: 800, fontSize: "1.3rem", marginBottom: 8 }}>Attendance saved!</h2>
        <p style={{ color: "#64748b", marginBottom: 28 }}>
          {Object.values(attendance).filter(v => v === "present").length} present ·{" "}
          {Object.values(attendance).filter(v => v === "absent").length} absent
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="action action-secondary" onClick={() => router.push("/teacher")} style={{ minHeight: 44 }}>
            ← Back to dashboard
          </button>
          <button className="action" onClick={() => {
            setStep("setup"); setLabel(""); setBatchId(""); setAttendance({});
          }} style={{ minHeight: 44 }}>
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
        <StepIndicator current={1} />
        <div className="card" style={{ padding: "28px 28px" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 20 }}>Who is this session for?</h2>

          {/* Session label */}
          <div className="field" style={{ marginBottom: 18 }}>
            <label htmlFor="session-label">Session name <span style={{ color: "#94a3b8", fontWeight: 500 }}>(optional)</span></label>
            <input id="session-label" type="text" placeholder={`e.g. Chemistry class — ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
              value={label} onChange={e => setLabel(e.target.value)} />
          </div>

          {/* Batch picker */}
          <div className="field" style={{ marginBottom: 18 }}>
            <label htmlFor="batch-select">Batch / section <span style={{ color: "#94a3b8", fontWeight: 500 }}>(optional)</span></label>
            {batches.length === 0 ? (
              <p style={{ fontSize: ".85rem", color: "#94a3b8", marginTop: 4 }}>No batches created yet — all students will be shown.</p>
            ) : (
              <select id="batch-select" value={batchId} onChange={e => setBatchId(e.target.value)}
                style={{ minHeight: 46, border: "1px solid #dbe3ef", borderRadius: 12, padding: "0 12px", background: "#fff", outline: "none" }}>
                <option value="">All students ({students.length})</option>
                {batches.map(b => {
                  const count = students.filter(s => s.batch_memberships.some(m => m.batch_id === b.id)).length;
                  return <option key={b.id} value={b.id}>{b.name} ({count})</option>;
                })}
              </select>
            )}
          </div>

          {/* Preview count */}
          <p style={{ fontSize: ".85rem", color: "#6d4aff", fontWeight: 700, marginBottom: 20 }}>
            {filtered.length} student{filtered.length !== 1 ? "s" : ""} will be in this session
          </p>

          <button className="action" disabled={filtered.length === 0}
            onClick={() => { initAttendance(filtered); setStep("mark"); }}
            style={{ width: "100%", minHeight: 50 }}>
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // ── STEP 2: Mark attendance ───────────────────────────────────────────────
  if (step === "mark") {
    const presentCount = Object.values(attendance).filter(v => v === "present").length;

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
              {tab === "camera" ? "📷 Camera scan" : "✏️ Manual roll call"}
            </button>
          ))}
        </div>

        {/* ── Camera tab ── */}
        {markTab === "camera" && (
          <CameraAttendance
            students={filtered.map(s => ({
              id: s.profile_id,
              name: s.full_name,
              photo_urls: photoUrls[s.profile_id] ?? [],
            }))}
            sessionId={institutionId}
            onAttendanceChange={(updated) => {
              setAttendance(prev => {
                const next = { ...prev };
                for (const [id, status] of Object.entries(updated)) next[id] = status;
                return next;
              });
            }}
            onDone={() => setStep("confirm")}
          />
        )}

        {/* ── Manual roll call ── */}
        {markTab === "manual" && (
          <div className="card" style={{ padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 800 }}>
                Mark attendance — {presentCount} / {filtered.length} present
              </h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setAttendance(Object.fromEntries(filtered.map(s => [s.profile_id, "present" as const])))}
                  style={{ fontSize: ".75rem", fontWeight: 700, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}>All present</button>
                <button onClick={() => setAttendance(Object.fromEntries(filtered.map(s => [s.profile_id, "absent" as const])))}
                  style={{ fontSize: ".75rem", fontWeight: 700, background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}>All absent</button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map(s => {
                const present = attendance[s.profile_id] === "present";
                return (
                  <div key={s.profile_id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 12, background: present ? "#f0fdf4" : "#fafbfd", border: `1.5px solid ${present ? "#bbf7d0" : "#e7edf5"}` }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: present ? "#22c55e" : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", color: present ? "white" : "#94a3b8", fontWeight: 800, fontSize: ".8rem", flexShrink: 0 }}>
                      {s.full_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: ".9rem", marginBottom: 1 }}>{s.full_name}</p>
                      {s.roll_number && <p style={{ color: "#94a3b8", fontSize: ".75rem" }}>#{s.roll_number}</p>}
                    </div>
                    <div style={{ display: "flex", gap: 6, flex: "0 0 230px", maxWidth: "100%" }}>
                      <button
                        type="button"
                        onClick={() => setAttendance(prev => ({ ...prev, [s.profile_id]: "present" }))}
                        aria-pressed={present}
                        style={{ flex: 1, minHeight: 50, borderRadius: 12, fontWeight: 800, fontSize: ".85rem", cursor: "pointer", background: present ? "#22c55e" : "#f0fdf4", color: present ? "white" : "#166534", border: present ? "1.5px solid #16a34a" : "1.5px solid #bbf7d0" }}
                      >
                        ✓ Present
                      </button>
                      <button
                        type="button"
                        onClick={() => setAttendance(prev => ({ ...prev, [s.profile_id]: "absent" }))}
                        aria-pressed={!present}
                        style={{ flex: 1, minHeight: 50, borderRadius: 12, fontWeight: 800, fontSize: ".85rem", cursor: "pointer", background: present ? "#fef2f2" : "#ef4444", color: present ? "#991b1b" : "white", border: present ? "1.5px solid #fecaca" : "1.5px solid #dc2626" }}
                      >
                        ✗ Absent
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <button className="action action-secondary" onClick={() => setStep("setup")} style={{ flex: "0 0 auto", minHeight: 50 }}>← Back</button>
          <button className="action" onClick={() => setStep("confirm")} style={{ flex: 1, minHeight: 50 }}>Review & save →</button>
        </div>
      </div>
    );
  }

  // ── STEP 3: Confirm & Save ────────────────────────────────────────────────
  const entries: AttendanceRecord[] = filtered.map(s => ({
    studentId: s.profile_id,
    status: attendance[s.profile_id] ?? "absent"
  }));

  const presentList = filtered.filter(s => attendance[s.profile_id] === "present");
  const absentList  = filtered.filter(s => attendance[s.profile_id] !== "present");

  return (
    <div>
      <StepIndicator current={3} />

      <div className="card" style={{ padding: "24px 24px", marginBottom: 16 }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 16 }}>Summary</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div style={{ background: "#f0fdf4", borderRadius: 14, padding: "16px", textAlign: "center" }}>
            <p style={{ fontSize: "2rem", fontWeight: 800, color: "#16a34a" }}>{presentList.length}</p>
            <p style={{ color: "#166534", fontSize: ".8rem", fontWeight: 700 }}>Present</p>
          </div>
          <div style={{ background: "#fef2f2", borderRadius: 14, padding: "16px", textAlign: "center" }}>
            <p style={{ fontSize: "2rem", fontWeight: 800, color: "#dc2626" }}>{absentList.length}</p>
            <p style={{ color: "#991b1b", fontSize: ".8rem", fontWeight: 700 }}>Absent</p>
          </div>
        </div>

        {label && <p style={{ fontSize: ".88rem", color: "#64748b", marginBottom: 8 }}>Session: <strong>{label}</strong></p>}
        {batchId && batches.find(b => b.id === batchId) && (
          <p style={{ fontSize: ".88rem", color: "#64748b" }}>Batch: <strong>{batches.find(b => b.id === batchId)?.name}</strong></p>
        )}
      </div>

      {saveState?.error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>{saveState.error}</div>
      )}

      <form action={saveAction}>
        <input type="hidden" name="label"      value={label} />
        <input type="hidden" name="batch_id"   value={batchId} />
        <input type="hidden" name="input_mode" value={inputMode} />
        <input type="hidden" name="entries"    value={JSON.stringify(entries)} />

        <div style={{ display: "flex", gap: 12 }}>
          <button type="button" className="action action-secondary" onClick={() => setStep("mark")}
            style={{ flex: "0 0 auto", minHeight: 50 }} disabled={saving}>
            ← Edit
          </button>
          <button type="submit" className="action" style={{ flex: 1, minHeight: 50 }} disabled={saving}>
            {saving
              ? <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />
                  Saving…
                </span>
              : "✅ Confirm & save"}
          </button>
        </div>
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function StepIndicator({ current }: { current: number }) {
  const steps = ["Who & what", "Mark attendance", "Review & save"];
  return (
    <div style={{ display: "flex", gap: 0, marginBottom: 24 }}>
      {steps.map((label, i) => {
        const n = i + 1;
        const active = n === current;
        const done   = n < current;
        return (
          <div key={n} style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", fontWeight: 800, fontSize: ".8rem",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: done ? "#22c55e" : active ? "#6d4aff" : "#e2e8f0",
                color: done || active ? "white" : "#94a3b8"
              }}>
                {done ? "✓" : n}
              </div>
              <span style={{ fontSize: ".7rem", fontWeight: 700, color: active ? "#6d4aff" : "#94a3b8", whiteSpace: "nowrap" }}>
                {label}
              </span>
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
