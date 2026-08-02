import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listStudents, listBatches } from "@/app/actions/admin/students";
import AddStudentForm from "./_components/AddStudentForm";
import SchoolZipImport from "./_components/SchoolZipImport";
import StudentList from "./_components/StudentList";

export const metadata = {
  title: "Students — ClassPulse Admin",
  description: "Manage student records, batches, and face photos for your school.",
};

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
        {/* Left: interactive student list with search + batch filter */}
        <section>
          <StudentList students={students as Parameters<typeof StudentList>[0]["students"]} batches={batches} />
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
