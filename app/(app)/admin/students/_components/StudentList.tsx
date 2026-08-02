"use client";

import { useState } from "react";
import StudentPhotosDialog from "./StudentPhotosDialog";

interface Batch { id: string; name: string; }
interface BatchMembership { batches: { name: string } | null; }
interface Student {
  profile_id: string;
  full_name: string;
  roll_number: string | null;
  login_id: string | null;
  batch_memberships: BatchMembership[] | null;
  profiles: { email: string | null } | null;
}

interface Props {
  students: Student[];
  batches: Batch[];
}

export default function StudentList({ students, batches }: Props) {
  const [activeBatch, setActiveBatch] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = students.filter(s => {
    const batchId = s.batch_memberships?.[0]?.batches?.name ?? null;
    const batchMatch = !activeBatch || (batchId && s.batch_memberships?.some(
      bm => batches.find(b => b.name === bm.batches?.name)?.id === activeBatch
    ));
    const q = search.toLowerCase();
    const searchMatch = !q || s.full_name.toLowerCase().includes(q) ||
      (s.roll_number ?? "").toLowerCase().includes(q) ||
      (s.login_id ?? "").toLowerCase().includes(q);
    return batchMatch && searchMatch;
  });

  return (
    <div>
      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "1rem", pointerEvents: "none" }}>🔍</span>
        <input
          type="text"
          placeholder="Search by name or ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "10px 14px 10px 40px",
            border: "1.5px solid #e7edf5", borderRadius: 12,
            fontSize: ".88rem", outline: "none",
            background: "white", color: "#172033",
            fontFamily: "inherit"
          }}
        />
        {search && (
          <button onClick={() => setSearch("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1rem", padding: 4 }}>×</button>
        )}
      </div>

      {/* Batch filter chips */}
      {batches.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <button
            onClick={() => setActiveBatch(null)}
            style={{
              border: "none", borderRadius: 20, padding: "5px 14px", fontSize: ".78rem", fontWeight: 700,
              cursor: "pointer", transition: "all .15s",
              background: activeBatch === null ? "#6d4aff" : "#f1f5f9",
              color: activeBatch === null ? "white" : "#64748b",
            }}
          >
            All
          </button>
          {batches.map(b => (
            <button
              key={b.id}
              onClick={() => setActiveBatch(activeBatch === b.id ? null : b.id)}
              style={{
                border: "none", borderRadius: 20, padding: "5px 14px", fontSize: ".78rem", fontWeight: 700,
                cursor: "pointer", transition: "all .15s",
                background: activeBatch === b.id ? "#6d4aff" : "#eef0ff",
                color: activeBatch === b.id ? "white" : "#4f3ac9",
              }}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}

      {/* Count */}
      <h2 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: 16 }}>
        {filtered.length === 0
          ? search || activeBatch ? "No matches" : "No students yet"
          : `${filtered.length} student${filtered.length !== 1 ? "s" : ""}`}
      </h2>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: "36px 24px", textAlign: "center", border: "1.5px dashed #dbe3ef", background: "#fafbfd" }}>
          <span style={{ fontSize: 40 }}>{search || activeBatch ? "🔍" : "🎓"}</span>
          <h3 style={{ fontWeight: 700, marginTop: 12, marginBottom: 8 }}>
            {search || activeBatch ? "No students match your filter" : "No students yet"}
          </h3>
          <p style={{ color: "#64748b", fontSize: ".88rem" }}>
            {search || activeBatch
              ? "Try a different name or clear the filter."
              : batches.length === 0
                ? "Create a batch first, then add students to it."
                : "Use the form to add your first student."}
          </p>
          {(search || activeBatch) && (
            <button
              onClick={() => { setSearch(""); setActiveBatch(null); }}
              style={{ marginTop: 14, padding: "8px 18px", borderRadius: 10, border: "1px solid #e7edf5", background: "white", cursor: "pointer", fontWeight: 700, fontSize: ".83rem", color: "#6d4aff" }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(s => {
            const batchName = s.batch_memberships?.[0]?.batches?.name ?? null;
            return (
              <div key={s.profile_id} className="card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#2563eb,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: ".85rem" }}>
                  {s.full_name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
                    <p style={{ fontWeight: 700, fontSize: ".93rem" }}>{s.full_name}</p>
                    {s.roll_number && <span style={{ color: "#94a3b8", fontSize: ".75rem" }}>#{s.roll_number}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <p style={{ color: "#64748b", fontSize: ".8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.profiles?.email ?? "—"}
                    </p>
                    {batchName && <span style={{ background: "#eef0ff", color: "#4f3ac9", borderRadius: 4, padding: "1px 6px", fontSize: ".7rem", fontWeight: 700 }}>{batchName}</span>}
                    {s.login_id && (
                      <span style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: 4, padding: "1px 6px", fontSize: ".68rem", fontWeight: 700 }}>
                        🎓 ID: {s.login_id}
                      </span>
                    )}
                  </div>
                </div>
                <StudentPhotosDialog studentId={s.profile_id} studentName={s.full_name} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
