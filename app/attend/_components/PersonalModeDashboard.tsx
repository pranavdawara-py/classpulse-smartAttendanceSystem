"use client";

import { useState } from "react";
import AddStudentPanel from "./AddStudentPanel";
import StandaloneAttendanceWizard from "./StandaloneAttendanceWizard";

interface Photo { id: string; object_path: string }
interface Student {
  id: string; name: string; roll_number: string | null;
  active: boolean; created_at: string;
  standalone_student_photos: Photo[];
}

interface Props {
  userId: string;
  userEmail: string;
  students: Student[];
  photoUrls: Record<string, string>;
}

type View = "roster" | "add-student" | "attendance";

export default function PersonalModeDashboard({ userId, userEmail, students, photoUrls }: Props) {
  const [view, setView] = useState<View>(students.length === 0 ? "add-student" : "roster");

  if (view === "add-student") {
    return <AddStudentPanel onDone={() => setView("roster")} onCancel={students.length > 0 ? () => setView("roster") : undefined} />;
  }

  if (view === "attendance") {
    return (
      <StandaloneAttendanceWizard
        students={students}
        photoUrls={photoUrls}
        sessionId={userId}
        onCancel={() => setView("roster")}
      />
    );
  }

  // ── Roster view ────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ color: "#92400e", fontSize: ".78rem", fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 4 }}>
            Personal Mode
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 4 }}>My students</h1>
          <p style={{ color: "#78716c", fontSize: ".87rem" }}>
            {userEmail} · {students.length} student{students.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a
            href="/attend/history"
            style={{ minHeight: 42, whiteSpace: "nowrap", padding: "10px 16px", borderRadius: 12, background: "#f1f5f9", color: "#475569", fontWeight: 700, fontSize: ".83rem", textDecoration: "none", display: "flex", alignItems: "center" }}
          >
            📋 History
          </a>
          <button
            onClick={() => setView("add-student")}
            className="action action-secondary"
            style={{ minHeight: 42, whiteSpace: "nowrap" }}
          >
            + Add student
          </button>
          <button
            onClick={() => setView("attendance")}
            className="action"
            disabled={students.length === 0}
            style={{ minHeight: 42, whiteSpace: "nowrap", background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
          >
            📷 Take attendance
          </button>
        </div>
      </div>

      {/* Empty state */}
      {students.length === 0 && (
        <div className="card" style={{ padding: "48px 28px", textAlign: "center", border: "1.5px dashed #fcd34d", background: "#fffbeb" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
          <h2 style={{ fontWeight: 800, marginBottom: 8 }}>No students yet</h2>
          <p style={{ color: "#78716c", maxWidth: 340, margin: "0 auto 20px" }}>
            Add your students and upload 1–3 photos each for face recognition. You can add more later.
          </p>
          <button className="action" onClick={() => setView("add-student")}
            style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
            Add your first student →
          </button>
        </div>
      )}

      {/* Student grid */}
      {students.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 14 }}>
          {students.map(s => {
            const photos = s.standalone_student_photos;
            const firstPhotoUrl = photos[0] ? photoUrls[photos[0].object_path] : null;
            const photoCount = photos.length;

            return (
              <div key={s.id} className="card" style={{ padding: "16px", textAlign: "center" }}>
                {/* Photo */}
                {firstPhotoUrl ? (
                  <img src={firstPhotoUrl} alt={s.name} style={{
                    width: 72, height: 72, borderRadius: "50%", objectFit: "cover",
                    border: "2.5px solid #fcd34d", marginBottom: 10, display: "block", margin: "0 auto 10px"
                  }} />
                ) : (
                  <div style={{
                    width: 72, height: 72, borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg,#fbbf24,#f59e0b)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontWeight: 800, fontSize: "1.1rem",
                    margin: "0 auto 10px"
                  }}>
                    {s.name.slice(0, 2).toUpperCase()}
                  </div>
                )}

                <p style={{ fontWeight: 700, fontSize: ".9rem", marginBottom: 2 }}>{s.name}</p>
                {s.roll_number && (
                  <p style={{ color: "#94a3b8", fontSize: ".72rem", marginBottom: 6 }}>#{s.roll_number}</p>
                )}

                {/* Photo count */}
                <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 10 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: i < photoCount ? "#f59e0b" : "#e2e8f0"
                    }} />
                  ))}
                </div>
                <p style={{ color: photoCount === 0 ? "#ef4444" : "#64748b", fontSize: ".7rem", fontWeight: 600 }}>
                  {photoCount === 0 ? "No photos yet" : `${photoCount}/3 photo${photoCount !== 1 ? "s" : ""}`}
                </p>
              </div>
            );
          })}

          {/* Add student card */}
          <button
            onClick={() => setView("add-student")}
            style={{
              padding: "16px", borderRadius: 20, border: "1.5px dashed #fcd34d",
              background: "#fffbeb", cursor: "pointer", textAlign: "center",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              minHeight: 160
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: "50%", background: "#fef3c7",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20
            }}>+</div>
            <p style={{ color: "#92400e", fontWeight: 700, fontSize: ".83rem" }}>Add student</p>
          </button>
        </div>
      )}

      {/* Reminder if any student has no photos */}
      {students.some(s => s.standalone_student_photos.length === 0) && (
        <div style={{
          marginTop: 20, background: "#fff7ed", border: "1px solid #fed7aa",
          borderRadius: 14, padding: "14px 18px", display: "flex", gap: 12, alignItems: "flex-start"
        }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: ".88rem", marginBottom: 2, color: "#9a3412" }}>
              Some students have no photos
            </p>
            <p style={{ color: "#78716c", fontSize: ".8rem" }}>
              Upload at least 1 photo per student for face recognition to work. You can add photos by clicking on a student.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
