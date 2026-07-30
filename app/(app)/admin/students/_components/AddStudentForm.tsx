"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import {
  createStudent, createBatch, importStudentsFromZip,
  type StudentActionState, type BatchActionState
} from "@/app/actions/admin/students";
import ZipImportPanel, { type ParsedStudent } from "@/app/components/shared/ZipImportPanel";

interface Props {
  batches: { id: string; name: string }[];
}

export default function AddStudentForm({ batches: initialBatches }: Props) {
  const [batches, setBatches] = useState(initialBatches);
  const [showZip, setShowZip]   = useState(false);

  // Student form state
  const [studentState, studentAction, studentPending] =
    useActionState<StudentActionState, FormData>(createStudent, null);
  const studentRef = useRef<HTMLFormElement>(null);

  // Batch form state
  const [batchState, batchAction, batchPending] =
    useActionState<BatchActionState, FormData>(createBatch, null);
  const batchRef = useRef<HTMLFormElement>(null);

  // Reset student form on success
  useEffect(() => {
    if (studentState?.success) studentRef.current?.reset();
  }, [studentState?.success]);

  // Add new batch to local state + reset batch form on success
  useEffect(() => {
    if (batchState?.success && batchState.batchId) {
      const nameInput = batchRef.current?.querySelector<HTMLInputElement>("[name='name']");
      if (nameInput?.value) {
        setBatches(prev => [...prev, { id: batchState.batchId!, name: nameInput.value }]);
      }
      batchRef.current?.reset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchState?.success]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Create Batch ── */}
      <div className="card" style={{ padding: "20px 22px" }}>
        <h2 style={{ fontSize: ".95rem", fontWeight: 800, marginBottom: 4 }}>Create a batch</h2>
        <p style={{ color: "#64748b", fontSize: ".8rem", marginBottom: 16 }}>
          e.g. "Class 10A", "Morning Batch"
        </p>

        {batchState?.error && (
          <div className="alert alert-error" style={{ marginBottom: 12 }}>{batchState.error}</div>
        )}
        {batchState?.success && (
          <div className="alert" style={{ marginBottom: 12, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 14px" }}>
            ✓ Batch created!
          </div>
        )}

        <form ref={batchRef} action={batchAction} noValidate>
          <div className="field" style={{ marginBottom: 14 }}>
            <label htmlFor="batch-name">Batch / section name <span style={{ color: "#ff4f88" }}>*</span></label>
            <input id="batch-name" name="name" type="text" required
              placeholder="e.g. Class 10A" disabled={batchPending} />
          </div>
          <button id="create-batch-btn" type="submit" className="action action-secondary"
            disabled={batchPending} style={{ width: "100%", minHeight: 42 }}>
            {batchPending ? "Creating…" : "+ Create batch"}
          </button>
        </form>
      </div>

      {/* ── Add Student ── */}
      <div className="card" style={{ padding: "22px 22px", position: "sticky", top: 24 }}>
        {/* Header + ZIP button */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4, gap: 8 }}>
          <div>
            <h2 style={{ fontSize: ".95rem", fontWeight: 800, marginBottom: 2 }}>Add a student</h2>
            <p style={{ color: "#64748b", fontSize: ".8rem" }}>
              You set the password. Share login details directly.
            </p>
          </div>
          <button onClick={() => setShowZip(true)} style={{
            fontSize: ".72rem", fontWeight: 700, background: "#f0f9ff", color: "#0369a1",
            border: "1px solid #bae6fd", borderRadius: 9, padding: "6px 10px",
            cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0
          }}>
            📦 Import ZIP
          </button>
        </div>

        {studentState?.error && (
          <div className="alert alert-error" style={{ marginBottom: 14, marginTop: 12 }}>{studentState.error}</div>
        )}
        {studentState?.success && (
          <div style={{ marginBottom: 14, marginTop: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "12px 14px" }}>
            <p style={{ fontWeight: 700, color: "#166534", fontSize: ".87rem", marginBottom: 6 }}>✓ Student added!</p>
            {studentState.loginId && (
              <div style={{ background: "#fff", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px", fontSize: ".78rem" }}>
                <p style={{ color: "#374151", marginBottom: 3 }}>Share these login details with the student:</p>
                <p style={{ color: "#1f2937" }}>🎓 <strong>Student ID:</strong> {studentState.loginId}</p>
                <p style={{ color: "#1f2937" }}>🔑 <strong>Password:</strong> as set above</p>
                <p style={{ color: "#94a3b8", marginTop: 4, fontSize: ".71rem" }}>Student selects their school + enters Student ID to log in.</p>
              </div>
            )}
          </div>
        )}

        <form ref={studentRef} action={studentAction} noValidate style={{ marginTop: 14 }}>
          <div className="field" style={{ marginBottom: 13 }}>
            <label htmlFor="student-name">Full name <span style={{ color: "#ff4f88" }}>*</span></label>
            <input id="student-name" name="full_name" type="text" required
              placeholder="e.g. Riya Mehta" disabled={studentPending} />
          </div>
          <div className="field" style={{ marginBottom: 13 }}>
            <label htmlFor="student-email">Email address <span style={{ color: "#94a3b8", fontSize: ".78rem", fontWeight: 400 }}>(optional)</span></label>
            <input id="student-email" name="email" type="email"
              placeholder="student@email.com — leave blank to use Student ID login" disabled={studentPending} />
            <span style={{ fontSize: ".72rem", color: "#94a3b8" }}>
              If blank, student logs in with their roll number + school selection.
            </span>
          </div>
          <div className="field" style={{ marginBottom: 13 }}>
            <label htmlFor="student-password">Password <span style={{ color: "#ff4f88" }}>*</span></label>
            <input id="student-password" name="password" type="text" required
              placeholder="Minimum 6 characters" disabled={studentPending} />
            <span style={{ fontSize: ".72rem", color: "#94a3b8" }}>
              You choose this. Share it with the student so they can log in.
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 13 }}>
            <div className="field">
              <label htmlFor="student-roll">Roll / Student ID <span style={{ color: "#ff4f88" }}>*</span></label>
              <input id="student-roll" name="roll_number" type="text" required
                placeholder="e.g. 42" disabled={studentPending} />
            </div>
            <div className="field">
              <label htmlFor="student-batch">Batch</label>
              <select id="student-batch" name="batch_id" disabled={studentPending || batches.length === 0}
                style={{ minHeight: 46, border: "1px solid #dbe3ef", borderRadius: 12, padding: "0 12px", background: "#fff", outline: "none" }}>
                <option value="">No batch</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
          <button id="add-student-btn" type="submit" className="action"
            disabled={studentPending} style={{ width: "100%", minHeight: 46 }}>
            {studentPending
              ? <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />
                  Adding…
                </span>
              : "🎓 Add student"}
          </button>
        </form>
      </div>

      {/* ZIP import overlay */}
      {showZip && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "24px 16px" }}>
          <div style={{ background: "white", borderRadius: 20, width: "100%", maxWidth: 640, padding: "24px", boxShadow: "0 24px 60px rgba(0,0,0,.25)" }}>
            <ZipImportPanel
              mode="school"
              onImport={async (students: ParsedStudent[], onProgress) => {
                let created = 0;
                const errors: string[] = [];
                // School mode: process one at a time (each needs its own auth account)
                for (let i = 0; i < students.length; i++) {
                  onProgress(i, students.length, students[i].name);
                  const res = await importStudentsFromZip([students[i]]);
                  created += res.created;
                  errors.push(...res.errors);
                }
                onProgress(students.length, students.length, "");
                return { created, errors };
              }}
              onCancel={() => setShowZip(false)}
            />
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
