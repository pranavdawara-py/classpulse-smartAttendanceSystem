"use client";

import { useState, useRef, useActionState } from "react";
import { uploadStudentSelfPhoto, deleteStudentSelfPhoto, type SelfPhotoState } from "@/app/actions/student/photos";

interface Photo {
  id: string;
  image_path: string;
  school_locked: boolean;
  uploaded_by_role: "school" | "student" | null;
  signedUrl?: string;
}

interface Props {
  photos: Photo[];
  maxPhotos?: number;
}

export default function StudentPhotoPanel({ photos: initialPhotos, maxPhotos = 3 }: Props) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadState, uploadAction, uploading] =
    useActionState<SelfPhotoState, FormData>(uploadStudentSelfPhoto, null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canUpload = photos.length < maxPhotos;

  async function handleDelete(id: string) {
    setDeletingId(id);
    const res = await deleteStudentSelfPhoto(id);
    if (!res.error) {
      setPhotos(prev => prev.filter(p => p.id !== id));
    } else {
      alert(res.error);
    }
    setDeletingId(null);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 style={{ fontWeight: 800, fontSize: ".95rem" }}>
          My face photos
          <span style={{ marginLeft: 8, color: "#94a3b8", fontWeight: 600, fontSize: ".78rem" }}>
            {photos.length}/{maxPhotos}
          </span>
        </h2>
        {canUpload && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              fontSize: ".78rem", fontWeight: 700, padding: "7px 14px",
              borderRadius: 10, border: "1.5px solid #6d4aff",
              background: uploading ? "#f5f3ff" : "#f5f3ff",
              color: "#6d4aff", cursor: uploading ? "wait" : "pointer"
            }}
          >
            {uploading ? "Uploading…" : "+ Add photo"}
          </button>
        )}
      </div>

      {/* Helper text */}
      <p style={{ color: "#64748b", fontSize: ".8rem", marginBottom: 14, lineHeight: 1.5 }}>
        Add up to {maxPhotos} clear face photos. The system uses these to recognise you during attendance.
        Photos added by your school are marked with 🔒 and cannot be deleted.
      </p>

      {/* Error */}
      {uploadState?.error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", marginBottom: 12 }}>
          <p style={{ color: "#dc2626", fontSize: ".83rem", fontWeight: 600 }}>{uploadState.error}</p>
        </div>
      )}

      {/* Success */}
      {uploadState?.success && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 14px", marginBottom: 12 }}>
          <p style={{ color: "#16a34a", fontSize: ".83rem", fontWeight: 600 }}>Photo uploaded successfully! ✓</p>
        </div>
      )}

      {/* Hidden file input + form */}
      <form action={uploadAction} style={{ display: "none" }} id="photo-upload-form">
        <input
          ref={fileRef}
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              const form = document.getElementById("photo-upload-form") as HTMLFormElement;
              form?.requestSubmit();
            }
          }}
        />
      </form>

      {/* Photo grid */}
      {photos.length === 0 ? (
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            width: "100%", padding: "32px 24px", borderRadius: 16,
            border: "1.5px dashed #6d4aff", background: "#fafbfd",
            cursor: "pointer", textAlign: "center"
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
          <p style={{ fontWeight: 700, color: "#6d4aff", marginBottom: 4 }}>Add your first photo</p>
          <p style={{ color: "#94a3b8", fontSize: ".78rem" }}>JPEG, PNG or WebP · Max 5 MB</p>
        </button>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 10 }}>
          {photos.map(photo => (
            <div key={photo.id} style={{ position: "relative" }}>
              {/* Photo */}
              <div style={{
                width: "100%", aspectRatio: "1", borderRadius: 12, overflow: "hidden",
                background: "#f1f5f9", border: "2px solid #e7edf5",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                {photo.signedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.signedUrl} alt="Face photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 28 }}>👤</span>
                )}
              </div>

              {/* Lock badge */}
              {photo.school_locked && (
                <span style={{
                  position: "absolute", top: 4, left: 4,
                  background: "rgba(0,0,0,.65)", color: "white",
                  borderRadius: 6, fontSize: ".65rem", fontWeight: 700, padding: "2px 5px"
                }}>
                  🔒
                </span>
              )}

              {/* Delete button (only for non-locked) */}
              {!photo.school_locked && (
                <button
                  onClick={() => handleDelete(photo.id)}
                  disabled={deletingId === photo.id}
                  style={{
                    position: "absolute", top: 4, right: 4,
                    width: 22, height: 22, borderRadius: "50%",
                    background: "rgba(220,38,38,.85)", color: "white",
                    border: "none", cursor: "pointer", fontSize: ".65rem",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800
                  }}
                >
                  {deletingId === photo.id ? "…" : "×"}
                </button>
              )}

              {/* Uploaded-by badge */}
              <p style={{ textAlign: "center", fontSize: ".62rem", color: "#94a3b8", marginTop: 4, fontWeight: 600 }}>
                {photo.school_locked ? "School" : "Mine"}
              </p>
            </div>
          ))}

          {/* "Add more" slot */}
          {canUpload && (
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                aspectRatio: "1", borderRadius: 12,
                border: "1.5px dashed #94a3b8", background: "#fafbfd",
                cursor: "pointer", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 4
              }}
            >
              <span style={{ fontSize: 22, color: "#64748b" }}>+</span>
              <span style={{ fontSize: ".62rem", color: "#94a3b8", fontWeight: 600 }}>Add</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
