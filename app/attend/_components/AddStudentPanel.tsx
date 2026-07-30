"use client";

import { useState, useRef } from "react";
import { bulkCreateStudents } from "@/app/actions/standalone/students";
import ZipImportPanel, { type ParsedStudent } from "@/app/components/shared/ZipImportPanel";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PhotoDraft {
  id: string;
  file: File;
  previewUrl: string;
}

interface StudentRow {
  id: string;
  name: string;
  rollNumber: string;
  photos: PhotoDraft[];
}

interface Props {
  onDone: () => void;
  onCancel?: () => void;
}

function uid() { return Math.random().toString(36).slice(2); }

function makeRow(): StudentRow {
  return { id: uid(), name: "", rollNumber: "", photos: [] };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AddStudentPanel({ onDone, onCancel }: Props) {
  const [rows, setRows]             = useState<StudentRow[]>([makeRow(), makeRow(), makeRow()]);
  const [submitting, setSubmitting]   = useState(false);
  const [result, setResult]           = useState<{ created: number; errors: string[] } | null>(null);
  const [quickText, setQuickText]     = useState("");
  const [showQuick, setShowQuick]     = useState(false);
  const [autoNumber, setAutoNumber]   = useState(false);
  const [photoWarning, setPhotoWarning] = useState<string[]>([]); // names missing photos
  const [showZip, setShowZip]         = useState(false);

  // File input refs: one per row × 3 photos
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Row mutations ──────────────────────────────────────────────────────────

  function updateRow(id: string, field: "name" | "rollNumber", val: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  }

  function removeRow(id: string) {
    setRows(prev => {
      const row = prev.find(r => r.id === id);
      row?.photos.forEach(p => URL.revokeObjectURL(p.previewUrl));
      let next = prev.length > 1 ? prev.filter(r => r.id !== id) : prev;
      if (autoNumber) next = next.map((r, i) => ({ ...r, rollNumber: String(i + 1) }));
      return next;
    });
  }

  function addRow() {
    setRows(prev => {
      const newRow = makeRow();
      if (autoNumber) newRow.rollNumber = String(prev.length + 1);
      return [...prev, newRow];
    });
  }

  function toggleAutoNumber() {
    const next = !autoNumber;
    setAutoNumber(next);
    if (next) {
      setRows(prev => prev.map((r, i) => ({ ...r, rollNumber: String(i + 1) })));
    }
  }

  // ── Photo handling ─────────────────────────────────────────────────────────

  function handlePhotoSelect(rowId: string, files: FileList | null) {
    if (!files?.length) return;
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      const slots = 3 - r.photos.length;
      if (slots <= 0) return r;
      const newPhotos: PhotoDraft[] = Array.from(files).slice(0, slots).map(file => ({
        id: uid(), file, previewUrl: URL.createObjectURL(file)
      }));
      return { ...r, photos: [...r.photos, ...newPhotos] };
    }));
  }

  function removePhoto(rowId: string, photoId: string) {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      const photo = r.photos.find(p => p.id === photoId);
      if (photo) URL.revokeObjectURL(photo.previewUrl);
      return { ...r, photos: r.photos.filter(p => p.id !== photoId) };
    }));
  }

  // ── Quick-paste names ──────────────────────────────────────────────────────

  function applyQuick() {
    const names = quickText.split("\n").map(s => s.trim()).filter(Boolean);
    if (!names.length) return;
    setRows(names.map(name => ({ ...makeRow(), name })));
    setShowQuick(false);
    setQuickText("");
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(force = false) {
    const valid = rows.filter(r => r.name.trim());
    if (!valid.length) return;

    // Photo warning — only in personal mode (school mode skips this)
    if (!force) {
      const missing = valid.filter(r => r.photos.length === 0).map(r => r.name.trim());
      if (missing.length > 0) {
        setPhotoWarning(missing);
        return; // wait for user to acknowledge
      }
    }

    setPhotoWarning([]);
    setSubmitting(true);
    const fd = new FormData();
    fd.append("count", String(valid.length));

    valid.forEach((student, i) => {
      fd.append(`student_${i}_name`, student.name.trim());
      fd.append(`student_${i}_roll`, student.rollNumber.trim());
      student.photos.forEach((p, j) => {
        fd.append(`student_${i}_photo_${j}`, p.file);
      });
    });

    const res = await bulkCreateStudents(fd);
    setResult(res);
    setSubmitting(false);
  }

  // ── Success screen ─────────────────────────────────────────────────────────

  if (result?.created) {
    return (
      <div style={{ maxWidth: 580, margin: "0 auto" }}>
        {onCancel && (
          <button onClick={onCancel} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#78716c", fontWeight: 700, fontSize: ".85rem", marginBottom: 20 }}>
            ← Back to roster
          </button>
        )}
        <div className="card" style={{ padding: "40px 28px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <h2 style={{ fontWeight: 800, fontSize: "1.25rem", marginBottom: 8 }}>
            {result.created} student{result.created !== 1 ? "s" : ""} added!
          </h2>
          {result.errors.length > 0 && (
            <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: "12px 16px", marginBottom: 18, textAlign: "left" }}>
              <p style={{ fontWeight: 700, color: "#9a3412", fontSize: ".85rem", marginBottom: 6 }}>⚠️ Some issues:</p>
              {result.errors.map((e, i) => (
                <p key={i} style={{ color: "#92400e", fontSize: ".78rem" }}>· {e}</p>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="action action-secondary" onClick={() => { setResult(null); setRows([makeRow(), makeRow(), makeRow()]); }} style={{ minHeight: 44 }}>
              + Add more students
            </button>
            <button className="action" onClick={onDone}
              style={{ minHeight: 44, background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
              Go to roster ✓
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form ──────────────────────────────────────────────────────────────

  const validCount = rows.filter(r => r.name.trim()).length;

  return (
    <div style={{ maxWidth: 660, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 10 }}>
        <div>
          {onCancel && (
            <button onClick={onCancel} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#78716c", fontWeight: 700, fontSize: ".85rem", marginBottom: 10 }}>
              ← Back to roster
            </button>
          )}
          <h1 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: 4 }}>Add students</h1>
          <p style={{ color: "#78716c", fontSize: ".87rem" }}>
            Fill in any order — name, roll number and photos. Press "Add students" when done.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
          <button onClick={() => setShowZip(true)} style={{
            fontSize: ".78rem", fontWeight: 700,
            background: "#f0f9ff", color: "#0369a1",
            border: "1px solid #bae6fd",
            borderRadius: 10, padding: "7px 12px", cursor: "pointer", whiteSpace: "nowrap"
          }}>
            📦 Upload ZIP
          </button>
          <button onClick={() => setShowQuick(!showQuick)} style={{
            fontSize: ".78rem", fontWeight: 700,
            background: showQuick ? "#fef3c7" : "#f8fafc",
            color: showQuick ? "#92400e" : "#64748b",
            border: "1px solid", borderColor: showQuick ? "#fcd34d" : "#e2e8f0",
            borderRadius: 10, padding: "7px 12px", cursor: "pointer", whiteSpace: "nowrap"
          }}>
            ✨ Paste names
          </button>
        </div>
      </div>

      {/* Quick-paste panel */}
      {showQuick && (
        <div className="card" style={{ padding: "16px 18px", marginBottom: 14, border: "1px solid #fcd34d", background: "#fffbeb" }}>
          <p style={{ fontWeight: 700, fontSize: ".85rem", marginBottom: 8 }}>Paste one name per line:</p>
          <textarea
            value={quickText} onChange={e => setQuickText(e.target.value)}
            placeholder={"Riya Mehta\nAryan Singh\nPriya Sharma"}
            style={{ width: "100%", minHeight: 110, border: "1px solid #dbe3ef", borderRadius: 10, padding: "10px 12px", fontSize: ".88rem", fontFamily: "inherit", resize: "vertical", outline: "none", marginBottom: 10 }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setShowQuick(false); setQuickText(""); }} style={{ flex: 1, padding: "9px", borderRadius: 10, border: "1px solid #e2e8f0", background: "none", fontWeight: 700, fontSize: ".82rem", cursor: "pointer", color: "#64748b" }}>Cancel</button>
            <button onClick={applyQuick} disabled={!quickText.trim()} className="action"
              style={{ flex: 1, minHeight: 38, background: "linear-gradient(135deg,#f59e0b,#d97706)", fontSize: ".85rem" }}>
              Add {quickText.split("\n").filter(s => s.trim()).length} names →
            </button>
          </div>
        </div>
      )}

      {/* Student rows */}
      <div className="card" style={{ padding: "10px 14px", marginBottom: 12 }}>
        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 100px 1fr 30px", gap: 8, alignItems: "center", padding: "6px 4px 10px", borderBottom: "1px solid #f1f5f9", marginBottom: 4 }}>
          <span />
          <span style={{ fontWeight: 700, fontSize: ".75rem", color: "#64748b", letterSpacing: ".04em", textTransform: "uppercase" }}>Name</span>
          <span style={{ fontWeight: 700, fontSize: ".75rem", color: "#64748b", letterSpacing: ".04em", textTransform: "uppercase" }}>Roll #</span>
          <span style={{ fontWeight: 700, fontSize: ".75rem", color: "#64748b", letterSpacing: ".04em", textTransform: "uppercase" }}>Photos (up to 3)</span>
          <span />
        </div>

        {rows.map((row, i) => (
          <div key={row.id} style={{
            display: "grid", gridTemplateColumns: "24px 1fr 100px 1fr 30px",
            gap: 8, alignItems: "center", padding: "6px 4px",
            borderBottom: i < rows.length - 1 ? "1px solid #f8fafd" : "none"
          }}>
            {/* Row number */}
            <span style={{ color: "#94a3b8", fontSize: ".75rem", fontWeight: 700, textAlign: "right" }}>{i + 1}</span>

            {/* Name */}
            <input
              type="text" value={row.name} placeholder="Student name"
              onChange={e => updateRow(row.id, "name", e.target.value)}
              style={{ width: "100%", height: 38, border: "1px solid #dbe3ef", borderRadius: 9, padding: "0 11px", fontSize: ".88rem", outline: "none", fontFamily: "inherit" }}
            />

            {/* Roll number */}
            <input
              type="text" value={row.rollNumber} placeholder={autoNumber ? "auto" : "e.g. 42"}
              onChange={e => !autoNumber && updateRow(row.id, "rollNumber", e.target.value)}
              disabled={autoNumber}
              style={{ width: "100%", height: 38, border: "1px solid #dbe3ef", borderRadius: 9, padding: "0 11px", fontSize: ".85rem", outline: "none", fontFamily: "inherit", background: autoNumber ? "#f8fafc" : "white", color: autoNumber ? "#94a3b8" : "inherit" }}
            />

            {/* Photos */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {/* Existing photo thumbnails */}
              {row.photos.map(photo => (
                <div key={photo.id} style={{ position: "relative", flexShrink: 0 }}>
                  <img src={photo.previewUrl} alt="" style={{ width: 34, height: 34, borderRadius: 8, objectFit: "cover", border: "1.5px solid #fcd34d", display: "block" }} />
                  <button onClick={() => removePhoto(row.id, photo.id)} style={{
                    position: "absolute", top: -5, right: -5,
                    width: 16, height: 16, borderRadius: "50%",
                    background: "#ef4444", color: "white", border: "none",
                    fontSize: ".6rem", cursor: "pointer", display: "flex",
                    alignItems: "center", justifyContent: "center", fontWeight: 900, lineHeight: 1
                  }}>×</button>
                </div>
              ))}

              {/* Camera button — only if under 3 photos */}
              {row.photos.length < 3 && (
                <>
                  <button
                    type="button"
                    onClick={() => fileRefs.current[row.id]?.click()}
                    title="Add photos"
                    style={{
                      width: 34, height: 34, borderRadius: 8, border: "1.5px dashed #fcd34d",
                      background: "#fffbeb", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, flexShrink: 0, color: "#f59e0b"
                    }}
                  >📷</button>
                  <input
                    ref={el => { fileRefs.current[row.id] = el; }}
                    type="file" accept="image/jpeg,image/png,image/webp"
                    multiple
                    style={{ display: "none" }}
                    onChange={e => handlePhotoSelect(row.id, e.target.files)}
                  />
                </>
              )}

              {/* Empty slots indicator */}
              {row.photos.length === 0 && (
                <span style={{ fontSize: ".68rem", color: "#cbd5e1", fontStyle: "italic" }}>no photos</span>
              )}
            </div>

            {/* Remove row */}
            <button onClick={() => removeRow(row.id)} disabled={rows.length === 1} style={{
              width: 30, height: 30, borderRadius: 8, border: "1px solid #f1f5f9",
              background: "none", cursor: rows.length > 1 ? "pointer" : "default",
              color: "#94a3b8", opacity: rows.length > 1 ? 1 : .3, fontSize: ".9rem"
            }}>×</button>
          </div>
        ))}

        {/* Add row button */}
        <button onClick={addRow} style={{
          width: "100%", marginTop: 8, padding: "9px", borderRadius: 10,
          border: "1.5px dashed #e2e8f0", background: "#fafbfd",
          color: "#64748b", fontWeight: 700, fontSize: ".83rem", cursor: "pointer"
        }}>
          + Add another row
        </button>
      </div>

      {/* Photo tip */}
      <p style={{ color: "#94a3b8", fontSize: ".75rem", marginBottom: 18, paddingLeft: 4 }}>
        💡 Click 📷 next to any student to add up to 3 face photos. Well-lit, front-facing photos give the best recognition results.
      </p>

      {/* Auto-number toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, padding: "12px 16px", background: autoNumber ? "#fffbeb" : "#f8fafc", borderRadius: 12, border: `1px solid ${autoNumber ? "#fcd34d" : "#e2e8f0"}` }}>
        <button
          onClick={toggleAutoNumber}
          aria-label="Auto roll numbers"
          style={{
            position: "relative", width: 42, height: 24, borderRadius: 12, flexShrink: 0,
            background: autoNumber ? "#f59e0b" : "#cbd5e1",
            border: "none", cursor: "pointer", transition: "background .2s", padding: 0
          }}
        >
          <span style={{
            position: "absolute", top: 3, left: autoNumber ? 21 : 3,
            width: 18, height: 18, borderRadius: "50%", background: "white",
            transition: "left .18s", display: "block"
          }} />
        </button>
        <div>
          <p style={{ fontWeight: 700, fontSize: ".85rem", color: "#334155", marginBottom: 1 }}>Auto roll numbers (1, 2, 3…)</p>
          <p style={{ fontSize: ".72rem", color: "#78716c" }}>
            {autoNumber ? "Roll numbers are filled automatically — toggle off to enter manually" : "Toggle on to auto-fill roll numbers in row order"}
          </p>
        </div>
      </div>

      {/* Photo warning */}
      {photoWarning.length > 0 && (
        <div style={{ background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 14, padding: "16px 18px", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
            <div>
              <p style={{ fontWeight: 800, color: "#9a3412", fontSize: ".88rem", marginBottom: 4 }}>
                {photoWarning.length} student{photoWarning.length > 1 ? "s" : ""} have no photos:
              </p>
              <p style={{ color: "#92400e", fontSize: ".8rem", lineHeight: 1.5 }}>
                {photoWarning.join(" · ")}
              </p>
              <p style={{ color: "#78716c", fontSize: ".75rem", marginTop: 6 }}>
                Photos are needed for face recognition. You can add them now or from the roster later.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setPhotoWarning([])} style={{ flex: 1, padding: "9px", borderRadius: 10, border: "1px solid #fed7aa", background: "white", fontWeight: 700, fontSize: ".82rem", cursor: "pointer", color: "#9a3412" }}>
              ← Add photos first
            </button>
            <button onClick={() => handleSubmit(true)} style={{ flex: 1, padding: "9px", borderRadius: 10, border: "none", background: "#f59e0b", color: "white", fontWeight: 700, fontSize: ".82rem", cursor: "pointer" }}>
              Add anyway →
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 12 }}>
        {onCancel && (
          <button onClick={onCancel} className="action action-secondary" style={{ flex: "0 0 auto", minHeight: 50, padding: "0 22px" }}>
            Cancel
          </button>
        )}
        <button onClick={() => handleSubmit()} className="action"
          disabled={submitting || validCount === 0}
          style={{ flex: 1, minHeight: 50, background: validCount > 0 ? "linear-gradient(135deg,#f59e0b,#d97706)" : "#e2e8f0", color: validCount > 0 ? "white" : "#94a3b8" }}>
          {submitting ? (
            <span style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
              <span style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />
              Adding {validCount} student{validCount !== 1 ? "s" : ""}…
            </span>
          ) : (
            validCount > 0 ? `Add ${validCount} student${validCount !== 1 ? "s" : ""} →` : "Enter at least one name"
          )}
        </button>
      </div>

      {/* ZIP import overlay */}
      {showZip && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "24px 16px" }}>
          <div style={{ background: "white", borderRadius: 20, width: "100%", maxWidth: 640, padding: "24px", boxShadow: "0 24px 60px rgba(0,0,0,.25)" }}>
            <ZipImportPanel
              mode="personal"
              onImport={async (students: ParsedStudent[], onProgress) => {
                let created = 0;
                const errors: string[] = [];
                const BATCH = 5;

                for (let i = 0; i < students.length; i += BATCH) {
                  const batch = students.slice(i, i + BATCH);
                  await Promise.allSettled(batch.map(async (s, bi) => {
                    onProgress(i + bi, students.length, s.name);
                    const fd = new FormData();
                    fd.append("count", "1");
                    fd.append("student_0_name", s.name);
                    fd.append("student_0_roll", s.rollNumber ?? "");
                    s.photos.forEach((file, j) => fd.append(`student_0_photo_${j}`, file));
                    const res = await bulkCreateStudents(fd);
                    created += res.created;
                    if (res.errors.length) errors.push(...res.errors);
                  }));
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
