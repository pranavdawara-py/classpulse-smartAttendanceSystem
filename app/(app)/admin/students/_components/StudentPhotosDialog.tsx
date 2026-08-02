"use client";

import { useState } from "react";
import { getStudentPhotosAdmin, togglePhotoLock } from "@/app/actions/admin/students";

type Photo = Awaited<ReturnType<typeof getStudentPhotosAdmin>>[number];

interface Props {
  studentId: string;
  studentName: string;
}

export default function StudentPhotosDialog({ studentId, studentName }: Props) {
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadPhotos() {
    setLoading(true);
    setError(null);
    try {
      setPhotos(await getStudentPhotosAdmin(studentId));
    } catch {
      setError("Unable to load photos. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function openDialog() {
    setOpen(true);
    await loadPhotos();
  }

  async function handleToggle(photo: Photo) {
    setUpdatingId(photo.id);
    setError(null);
    const result = await togglePhotoLock(photo.id, !photo.school_locked);
    if (result.error) {
      setError(result.error);
    } else {
      await loadPhotos();
    }
    setUpdatingId(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        style={{ minHeight: 44, padding: "0 12px", borderRadius: 10, border: "1px solid #c7d2fe", background: "#eef2ff", color: "#4338ca", fontWeight: 700, fontSize: ".76rem", cursor: "pointer", whiteSpace: "nowrap" }}
      >
        Photos
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "24px 16px" }}>
          <div role="dialog" aria-modal="true" aria-labelledby={`student-photos-title-${studentId}`} style={{ background: "white", borderRadius: 20, width: "100%", maxWidth: 640, padding: 24, boxShadow: "0 24px 60px rgba(0,0,0,.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 18 }}>
              <div>
                <p style={{ color: "#64748b", fontSize: ".75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Student face photos</p>
                <h2 id={`student-photos-title-${studentId}`} style={{ fontSize: "1.1rem", fontWeight: 800 }}>Photos — {studentName}</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close photo dialog" style={{ minWidth: 44, minHeight: 44, borderRadius: 10, border: "1px solid #e2e8f0", background: "white", color: "#64748b", fontSize: "1.1rem", cursor: "pointer" }}>×</button>
            </div>

            {loading ? (
              <div style={{ minHeight: 160, display: "grid", placeItems: "center", color: "#64748b", fontWeight: 600 }}>Loading photos…</div>
            ) : (
              <>
                {error && <p role="alert" style={{ marginBottom: 14, borderRadius: 10, padding: "10px 12px", background: "#fef2f2", color: "#b91c1c", fontSize: ".82rem", fontWeight: 600 }}>{error}</p>}
                {photos.length === 0 ? (
                  <p style={{ padding: "32px 12px", textAlign: "center", color: "#64748b" }}>No face photos uploaded yet.</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                    {photos.map(photo => (
                      <article key={photo.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 8, minWidth: 0 }}>
                        <img src={photo.signed_url} alt={`Face photo for ${studentName}`} style={{ width: "100%", aspectRatio: "1", display: "block", borderRadius: 8, objectFit: "cover", background: "#f1f5f9" }} />
                        <span style={{ display: "inline-block", marginTop: 8, borderRadius: 20, padding: "3px 7px", fontSize: ".66rem", fontWeight: 700, background: photo.uploaded_by_role === "school" ? "#dbeafe" : "#f1f5f9", color: photo.uploaded_by_role === "school" ? "#1d4ed8" : "#475569" }}>
                          {photo.uploaded_by_role === "school" ? "School upload" : "Student upload"}
                        </span>
                        <button type="button" onClick={() => handleToggle(photo)} disabled={updatingId === photo.id} aria-pressed={photo.school_locked} style={{ width: "100%", minHeight: 44, marginTop: 8, borderRadius: 9, border: `1px solid ${photo.school_locked ? "#86efac" : "#cbd5e1"}`, background: photo.school_locked ? "#f0fdf4" : "#f8fafc", color: photo.school_locked ? "#15803d" : "#475569", fontWeight: 700, fontSize: ".72rem", cursor: updatingId === photo.id ? "wait" : "pointer" }}>
                          {updatingId === photo.id ? "Saving…" : photo.school_locked ? "Locked" : "Unlocked"}
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}

            <button type="button" onClick={() => setOpen(false)} className="action action-secondary" style={{ width: "100%", minHeight: 46, marginTop: 20 }}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}
