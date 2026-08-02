import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listTeachers } from "@/app/actions/admin/teachers";
import InviteTeacherForm from "./_components/InviteTeacherForm";

export const metadata = {
  title: "Teachers — ClassPulse Admin",
  description: "Invite and manage teacher accounts for your school.",
};

export default async function TeachersPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role, institution_id").eq("id", user.id).single();

  if (profile?.role !== "admin" || !profile.institution_id) redirect("/dashboard");

  const teachers = await listTeachers(profile.institution_id);

  return (
    <main className="page">
      <div style={{ marginBottom: 28 }}>
        <p className="eyebrow">School administration</p>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: 6, marginBottom: 8 }}>Teachers</h1>
        <p style={{ color: "#64748b", fontSize: ".93rem" }}>
          Invite teachers by email. They will receive a link to set their own password.
        </p>
      </div>

      <div style={{ display: "grid", gap: 24, gridTemplateColumns: "1fr 340px" }} className="teachers-grid">
        {/* Left: list */}
        <section>
          <h2 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: 16 }}>
            {teachers.length === 0 ? "No teachers yet" : `${teachers.length} teacher${teachers.length !== 1 ? "s" : ""}`}
          </h2>
          {teachers.length === 0 ? (
            <div className="card" style={{ padding: "36px 24px", textAlign: "center", border: "1.5px dashed #dbe3ef", background: "#fafbfd" }}>
              <span style={{ fontSize: 40 }}>👩‍🏫</span>
              <h3 style={{ fontWeight: 700, marginTop: 12, marginBottom: 8 }}>No teachers yet</h3>
              <p style={{ color: "#64748b", fontSize: ".88rem" }}>
                Use the form to invite your first teacher. They will get an email to set up their account.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {teachers.map(t => (
                <div key={t.profile_id} className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg,#0d9488,#0f766e)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontWeight: 800, fontSize: ".9rem"
                  }}>
                    {t.full_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: ".95rem", marginBottom: 2 }}>{t.full_name}</p>
                    <p style={{ color: "#64748b", fontSize: ".82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.profiles?.email ?? "—"}
                    </p>
                  </div>
                  <span style={{
                    fontSize: ".72rem", fontWeight: 700, borderRadius: 6, padding: "3px 9px",
                    background: t.active ? "#f0fdf4" : "#fef9c3",
                    color: t.active ? "#15803d" : "#854d0e"
                  }}>
                    {t.active ? "Active" : "Invited"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right: form */}
        <aside>
          <InviteTeacherForm />
        </aside>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .teachers-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
