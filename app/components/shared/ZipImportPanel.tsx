"use client";

/**
 * ZipImportPanel — shared component for ZIP bulk-import.
 * Used in Personal Mode (AddStudentPanel) and School Mode (admin students page).
 *
 * Flow:
 *   1. Teacher selects a ZIP file
 *   2. fflate parses it (non-blocking, Web Worker)
 *   3. Preview table: name · roll · email · batch · photo count
 *   4. Duplicate resolution cards (interactive per duplicate)
 *   5. Confirm → parent's onImport(students) handles the actual DB writes
 *      with per-student progress shown here
 */

import { useState, useRef, useCallback } from "react";
import { parseZip, type ParsedStudent, type ParseResult } from "@/lib/zip-parser";

// ── Re-export so AddStudentPanel can import the type ─────────────────────────
export type { ParsedStudent };

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  mode: "personal" | "school";
  /** Called with the confirmed (and duplicate-resolved) student list.
   *  Parent is responsible for calling the server action and returning
   *  { created, errors }. Progress is reported via onProgress. */
  onImport: (
    students: ParsedStudent[],
    onProgress: (done: number, total: number, currentName: string) => void
  ) => Promise<{ created: number; errors: string[] }>;
  onCancel: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

type Screen = "pick" | "parsing" | "resolve" | "preview" | "uploading" | "done";

interface DuplicateResolution {
  name: string;
  indices: number[]; // indices into parseResult.students
  keep: "all" | number; // "all" = keep all with suffix; number = index to keep
}

export default function ZipImportPanel({ mode, onImport, onCancel }: Props) {
  const [screen, setScreen]             = useState<Screen>("pick");
  const [parseResult, setParseResult]   = useState<ParseResult | null>(null);
  const [resolutions, setResolutions]   = useState<DuplicateResolution[]>([]);
  const [removed, setRemoved]           = useState<Set<number>>(new Set());
  const [progress, setProgress]         = useState({ done: 0, total: 0, name: "" });
  const [importResult, setImportResult] = useState<{ created: number; errors: string[] } | null>(null);
  const [parseError, setParseError]     = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── File selection ─────────────────────────────────────────────────────────

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".zip")) {
      setParseError("Please select a .zip file.");
      return;
    }
    setParseError(null);
    setScreen("parsing");

    const result = await parseZip(file);

    if (result.students.length === 0 && result.errors.length > 0) {
      setParseError(result.errors[0].message);
      setScreen("pick");
      return;
    }

    setParseResult(result);

    // Init resolution state for duplicates
    setResolutions(result.duplicates.map(d => ({
      name: d.name,
      indices: d.indices,
      keep: "all",
    })));

    setRemoved(new Set());

    if (result.duplicates.length > 0) {
      setScreen("resolve");
    } else {
      setScreen("preview");
    }
  }, []);

  // ── Duplicate resolution ───────────────────────────────────────────────────

  function updateResolution(name: string, keep: "all" | number) {
    setResolutions(prev => prev.map(r => r.name === name ? { ...r, keep } : r));
  }

  // Compute final student list after duplicate resolution + removals
  function getFinalStudents(): ParsedStudent[] {
    if (!parseResult) return [];
    const toRemove = new Set<number>(removed);

    // Apply duplicate resolutions
    for (const res of resolutions) {
      if (res.keep === "all") {
        // Suffix duplicates with (1), (2), etc.
        res.indices.forEach((idx, i) => {
          if (i > 0) {
            parseResult.students[idx] = {
              ...parseResult.students[idx],
              name: `${parseResult.students[idx].name} (${i + 1})`,
            };
          }
        });
      } else {
        // Remove all except the kept one
        res.indices.forEach(idx => {
          if (idx !== res.keep) toRemove.add(idx);
        });
      }
    }

    return parseResult.students.filter((_, i) => !toRemove.has(i));
  }

  // ── Import ─────────────────────────────────────────────────────────────────

  async function handleImport() {
    const students = getFinalStudents();
    if (!students.length) return;

    setScreen("uploading");
    setProgress({ done: 0, total: students.length, name: students[0].name });

    const result = await onImport(students, (done, total, name) => {
      setProgress({ done, total, name });
    });

    setImportResult(result);
    setScreen("done");
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function photoCountBadge(count: number) {
    if (count === 0) return (
      <span style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 20, fontSize: ".68rem", fontWeight: 700, padding: "2px 8px" }}>
        No photos
      </span>
    );
    return (
      <span style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: 20, fontSize: ".68rem", fontWeight: 700, padding: "2px 8px" }}>
        📷 {count} photo{count !== 1 ? "s" : ""}
      </span>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Screens
  // ─────────────────────────────────────────────────────────────────────────

  // ── PICK ──────────────────────────────────────────────────────────────────
  if (screen === "pick") return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontWeight: 800, fontSize: "1.1rem" }}>📦 Import from ZIP</h2>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 20, lineHeight: 1 }}>×</button>
      </div>

      {/* Structure reminder */}
      <div style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 16px", marginBottom: 20, fontFamily: "monospace", fontSize: ".75rem", color: "#475569", lineHeight: 1.8 }}>
        <p style={{ fontWeight: 700, color: "#334155", marginBottom: 6, fontFamily: "inherit" }}>Expected ZIP structure:</p>
        students.zip/<br />
        └── students/<br />
        {"    "}├── Riya Mehta/<br />
        {"    "}│{"   "}├── profile.jpg &nbsp;<span style={{ color: "#94a3b8" }}>← profile photo</span><br />
        {"    "}│{"   "}├── photo1.jpg<br />
        {"    "}│{"   "}└── info.json &nbsp;&nbsp;&nbsp;<span style={{ color: "#94a3b8" }}>← optional details</span><br />
        {"    "}└── 01_Aryan Singh/ <span style={{ color: "#94a3b8" }}>← roll_name format</span>
      </div>

      {/* info.json reminder */}
      <div style={{ background: "#fefce8", border: "1px solid #fef08a", borderRadius: 12, padding: "12px 14px", marginBottom: 20, fontSize: ".78rem", color: "#713f12" }}>
        <p style={{ fontWeight: 700, marginBottom: 4 }}>info.json can contain:</p>
        name · roll_number · email · batch · section · phone · parent_name · parent_phone · address · date_of_birth · blood_group · notes · and anything else your school needs
      </div>

      {parseError && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 14px", marginBottom: 16, color: "#dc2626", fontSize: ".83rem", fontWeight: 600 }}>
          ⚠️ {parseError}
        </div>
      )}

      <input ref={fileRef} type="file" accept=".zip" style={{ display: "none" }} onChange={handleFileChange} />

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onCancel} className="action action-secondary" style={{ flex: "0 0 auto", minHeight: 48, padding: "0 20px" }}>
          Cancel
        </button>
        <button onClick={() => fileRef.current?.click()} className="action"
          style={{ flex: 1, minHeight: 48, background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}>
          Choose ZIP file →
        </button>
      </div>
    </div>
  );

  // ── PARSING ────────────────────────────────────────────────────────────────
  if (screen === "parsing") return (
    <div style={{ padding: "40px 0", textAlign: "center" }}>
      <div style={{ width: 48, height: 48, border: "3px solid #e2e8f0", borderTopColor: "#0ea5e9", borderRadius: "50%", animation: "spin .7s linear infinite", margin: "0 auto 16px" }} />
      <p style={{ fontWeight: 700, color: "#334155" }}>Parsing your ZIP…</p>
      <p style={{ color: "#94a3b8", fontSize: ".83rem" }}>Extracting student data and photos</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // ── RESOLVE DUPLICATES ─────────────────────────────────────────────────────
  if (screen === "resolve" && parseResult) return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontWeight: 800, fontSize: "1.05rem" }}>⚠️ Duplicate names found</h2>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 20 }}>×</button>
      </div>
      <p style={{ color: "#64748b", fontSize: ".85rem", marginBottom: 18 }}>
        These student names appear more than once. Choose how to handle each:
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20, maxHeight: 340, overflowY: "auto" }}>
        {resolutions.map(res => {
          const students = res.indices.map(i => parseResult.students[i]);
          return (
            <div key={res.name} style={{ border: "1.5px solid #fed7aa", borderRadius: 14, padding: "14px 16px", background: "#fff7ed" }}>
              <p style={{ fontWeight: 800, color: "#9a3412", fontSize: ".88rem", marginBottom: 12 }}>
                "{res.name}" — {res.indices.length} students
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {students.map((s, si) => (
                  <div key={si} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: "white", borderRadius: 9, border: "1px solid #fed7aa" }}>
                    <div>
                      <span style={{ fontSize: ".82rem", fontWeight: 600 }}>{s.folderName}</span>
                      {s.rollNumber && <span style={{ color: "#94a3b8", fontSize: ".72rem", marginLeft: 6 }}>#{s.rollNumber}</span>}
                    </div>
                    {photoCountBadge(s.photos.length)}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={() => updateResolution(res.name, "all")}
                  style={{ flex: 1, padding: "7px 10px", borderRadius: 9, border: `1.5px solid ${res.keep === "all" ? "#f59e0b" : "#e2e8f0"}`, background: res.keep === "all" ? "#fef3c7" : "white", fontWeight: 700, fontSize: ".75rem", cursor: "pointer", color: res.keep === "all" ? "#92400e" : "#64748b" }}>
                  Keep all (add numbers)
                </button>
                {res.indices.map((idx, si) => (
                  <button key={idx} onClick={() => updateResolution(res.name, idx)}
                    style={{ flex: 1, padding: "7px 10px", borderRadius: 9, border: `1.5px solid ${res.keep === idx ? "#22c55e" : "#e2e8f0"}`, background: res.keep === idx ? "#f0fdf4" : "white", fontWeight: 700, fontSize: ".75rem", cursor: "pointer", color: res.keep === idx ? "#166534" : "#64748b" }}>
                    Keep #{si + 1} only
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={() => setScreen("preview")} className="action"
        style={{ width: "100%", minHeight: 48, background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}>
        Continue to preview →
      </button>
    </div>
  );

  // ── PREVIEW ────────────────────────────────────────────────────────────────
  if (screen === "preview" && parseResult) {
    const finalStudents = getFinalStudents();
    const withPhotos    = finalStudents.filter(s => s.photos.length > 0).length;
    const withoutPhotos = finalStudents.length - withPhotos;

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontWeight: 800, fontSize: "1.05rem" }}>Preview — {finalStudents.length} students</h2>
          <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 20 }}>×</button>
        </div>

        {/* Summary chips */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <span style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: 20, fontSize: ".75rem", fontWeight: 700, padding: "4px 12px" }}>
            ✓ {withPhotos} with photos
          </span>
          {withoutPhotos > 0 && (
            <span style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 20, fontSize: ".75rem", fontWeight: 700, padding: "4px 12px" }}>
              ⚠ {withoutPhotos} without photos
            </span>
          )}
          {parseResult.errors.length > 0 && (
            <span style={{ background: "#fefce8", color: "#ca8a04", border: "1px solid #fef08a", borderRadius: 20, fontSize: ".75rem", fontWeight: 700, padding: "4px 12px" }}>
              ⚠ {parseResult.errors.length} warning{parseResult.errors.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Student list */}
        <div style={{ maxHeight: 320, overflowY: "auto", borderRadius: 12, border: "1px solid #e7edf5", marginBottom: 16 }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 110px 28px", gap: 8, padding: "8px 12px", background: "#f8fafc", borderBottom: "1px solid #e7edf5", fontSize: ".71rem", fontWeight: 700, color: "#64748b", letterSpacing: ".04em", textTransform: "uppercase" }}>
            <span>Name</span><span>Roll</span><span>Batch</span><span>Photos</span><span />
          </div>

          {finalStudents.map((s, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 110px 28px", gap: 8, padding: "8px 12px", borderBottom: i < finalStudents.length - 1 ? "1px solid #f1f5f9" : "none", alignItems: "center", fontSize: ".82rem" }}>
              <div>
                <p style={{ fontWeight: 600 }}>{s.name}</p>
                {s.email && <p style={{ color: "#94a3b8", fontSize: ".7rem" }}>{s.email}</p>}
              </div>
              <span style={{ color: "#64748b" }}>{s.rollNumber ?? "—"}</span>
              <span style={{ color: "#64748b" }}>{s.batch ?? "—"}</span>
              {photoCountBadge(s.photos.length)}
              <button onClick={() => setRemoved(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; })}
                title={removed.has(i) ? "Restore" : "Remove"}
                style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid #e2e8f0", background: removed.has(i) ? "#fef2f2" : "none", color: removed.has(i) ? "#dc2626" : "#94a3b8", cursor: "pointer", fontSize: ".75rem", fontWeight: 900 }}>
                {removed.has(i) ? "↩" : "×"}
              </button>
            </div>
          ))}
        </div>

        {/* Errors */}
        {parseResult.errors.length > 0 && (
          <div style={{ background: "#fefce8", border: "1px solid #fef08a", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
            <p style={{ fontWeight: 700, fontSize: ".78rem", color: "#713f12", marginBottom: 4 }}>Warnings (these students were still included):</p>
            {parseResult.errors.map((e, i) => (
              <p key={i} style={{ fontSize: ".73rem", color: "#92400e" }}>· {e.message}</p>
            ))}
          </div>
        )}

        {mode === "personal" && withoutPhotos > 0 && (
          <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: ".78rem", color: "#92400e" }}>
            ⚠️ {withoutPhotos} student{withoutPhotos > 1 ? "s" : ""} will be imported without photos. Face recognition requires photos to work.
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setScreen("pick")} className="action action-secondary" style={{ flex: "0 0 auto", minHeight: 48, padding: "0 18px" }}>
            ← Back
          </button>
          <button onClick={handleImport} className="action" disabled={finalStudents.length === 0}
            style={{ flex: 1, minHeight: 48, background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
            Import {finalStudents.length} student{finalStudents.length !== 1 ? "s" : ""} →
          </button>
        </div>
      </div>
    );
  }

  // ── UPLOADING ──────────────────────────────────────────────────────────────
  if (screen === "uploading") {
    const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
    return (
      <div style={{ padding: "32px 8px" }}>
        <h2 style={{ fontWeight: 800, fontSize: "1.05rem", marginBottom: 20, textAlign: "center" }}>
          Uploading students…
        </h2>
        <div style={{ background: "#f1f5f9", borderRadius: 99, height: 10, marginBottom: 12, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#f59e0b,#d97706)", width: `${pct}%`, transition: "width .3s ease" }} />
        </div>
        <p style={{ textAlign: "center", fontSize: ".83rem", color: "#64748b", marginBottom: 6 }}>
          {progress.done} / {progress.total} students
        </p>
        {progress.name && (
          <p style={{ textAlign: "center", fontSize: ".75rem", color: "#94a3b8" }}>
            Uploading: {progress.name}
          </p>
        )}
      </div>
    );
  }

  // ── DONE ───────────────────────────────────────────────────────────────────
  if (screen === "done" && importResult) return (
    <div style={{ padding: "32px 8px", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
      <h2 style={{ fontWeight: 800, fontSize: "1.2rem", marginBottom: 8 }}>
        {importResult.created} student{importResult.created !== 1 ? "s" : ""} imported!
      </h2>
      {importResult.errors.length > 0 && (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: "12px 16px", marginBottom: 18, textAlign: "left" }}>
          <p style={{ fontWeight: 700, color: "#9a3412", fontSize: ".85rem", marginBottom: 6 }}>Some issues:</p>
          {importResult.errors.slice(0, 5).map((e, i) => (
            <p key={i} style={{ color: "#92400e", fontSize: ".78rem" }}>· {e}</p>
          ))}
          {importResult.errors.length > 5 && (
            <p style={{ color: "#92400e", fontSize: ".75rem", marginTop: 4 }}>…and {importResult.errors.length - 5} more</p>
          )}
        </div>
      )}
      <button onClick={onCancel} className="action"
        style={{ minHeight: 46, padding: "0 28px", background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
        Done — go to roster ✓
      </button>
    </div>
  );

  return null;
}
