import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listStudents, listBatches } from "@/app/actions/admin/students";
import AddStudentForm from "./_components/AddStudentForm";
import SchoolZipImport from "./_components/SchoolZipImport";
import StudentPhotosDialog from "./_components/StudentPhotosDialog";

export default async function StudentsPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role, institution_id").eq("id", user.id).single();

  if (profile?.role !== "admin" || !profile.institution_id) redirect("/dashboard");

  const [students, batches] = await Promise.all([
    listStudents(profile.institution_id),
    listBatches(profile.institution_id)
  ]);

  return (
    <main className="page">
      <div style={{ marginBottom: 28 }}>
        <p className="eyebrow">School administration</p>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginTop: 6 }}>
          <div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: 8 }}>Students</h1>
            <p style={{ color: "#64748b", fontSize: ".93rem" }}>
              Add student records and organise them into batches or sections.
              You set the login credentials — share them with students directly.
            </p>
          </div>
          <SchoolZipImport />
        </div>
      </div>

      <div style={{ display: "grid", gap: 24, gridTemplateColumns: "1fr 360px" }} className="students-grid">
        {/* Left: student list */}
        <section>
          {/* Batch filter pills */}
          {batches.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              <span style={{ fontSize: ".78rem", fontWeight: 700, color: "#64748b", alignSelf: "center" }}>Batch:</span>
              {batches.map(b => (
                <span key={b.id} style={{
                  background: "#eef0ff", color: "#4f3ac9",
                  borderRadius: 20, padding: "4px 12px", fontSize: ".78rem", fontWeight: 700
                }}>
                  {b.name}
                </span>
              ))}
            </div>
          )}

          <h2 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: 16 }}>
            {students.length === 0 ? "No students yet" : `${students.length} student${students.length !== 1 ? "s" : ""}`}
          </h2>

          {students.length === 0 ? (
            <div className="card" style={{ padding: "36px 24px", textAlign: "center", border: "1.5px dashed #dbe3ef", background: "#fafbfd" }}>
              <span style={{ fontSize: 40 }}>🎓</span>
              <h3 style={{ fontWeight: 700, marginTop: 12, marginBottom: 8 }}>No students yet</h3>
              <p style={{ color: "#64748b", fontSize: ".88rem" }}>
                {batches.length === 0
                  ? "Create a batch first, then add students to it."
                  : "Use the form to add your first student."}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {students.map(s => {
                const batchName = s.batch_memberships?.[0]?.batches?.name ?? null;
                return (
                  <div key={s.profile_id} className="card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                      background: "linear-gradient(135deg,#2563eb,#6366f1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontWeight: 800, fontSize: ".85rem"
                    }}>
                      {s.full_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
                        <p style={{ fontWeight: 700, fontSize: ".93rem" }}>{s.full_name}</p>
                        {s.roll_number && (
                          <span style={{ color: "#94a3b8", fontSize: ".75rem" }}>#{s.roll_number}</span>
                        )}
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
        </section>

        {/* Right: forms */}
        <aside>
          <AddStudentForm batches={batches} />
        </aside>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .students-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
