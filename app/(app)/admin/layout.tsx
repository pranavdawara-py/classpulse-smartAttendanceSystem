import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminSidebar from "./_components/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, institution_id, institutions(name)")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  const schoolName = (profile?.institutions as unknown as { name: string } | null)?.name ?? "Your School";

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Desktop sidebar */}
      <div className="admin-sidebar-wrapper">
        <AdminSidebar schoolName={schoolName} userEmail={user.email ?? ""} />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, background: "#f7f8fc", overflow: "auto" }}>
        {/* Mobile top bar */}
        <div className="admin-mobile-bar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 8,
              background: "linear-gradient(135deg,#6d4aff,#c849f4)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13
            }}>⚡</span>
            <span style={{ fontWeight: 800, fontSize: "1rem" }}>ClassPulse</span>
          </div>
          <span style={{ fontSize: ".78rem", color: "#64748b", fontWeight: 600 }}>{schoolName}</span>
        </div>

        {/* Mobile nav tabs */}
        <div className="admin-mobile-tabs">
          {[
            { href: "/admin",          label: "Overview",  emoji: "📊" },
            { href: "/admin/teachers", label: "Teachers",  emoji: "👩‍🏫" },
            { href: "/admin/students", label: "Students",  emoji: "🎓" },
          ].map(item => (
            <a key={item.href} href={item.href} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              padding: "8px 12px", textDecoration: "none",
              color: "#64748b", fontSize: ".7rem", fontWeight: 700
            }}>
              <span style={{ fontSize: 18 }}>{item.emoji}</span>
              {item.label}
            </a>
          ))}
        </div>

        {children}
      </div>

      <style>{`
        .admin-sidebar-wrapper { display: flex; }
        .admin-mobile-bar { display: none; }
        .admin-mobile-tabs { display: none; }
        @media (max-width: 768px) {
          .admin-sidebar-wrapper { display: none; }
          .admin-mobile-bar {
            display: flex; align-items: center; justify-content: space-between;
            padding: 12px 16px; background: white;
            border-bottom: 1px solid #e7edf5;
          }
          .admin-mobile-tabs {
            display: flex; background: white;
            border-bottom: 1px solid #e7edf5; overflow-x: auto;
          }
        }
      `}</style>
    </div>
  );
}
