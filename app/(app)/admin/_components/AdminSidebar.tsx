"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin",          label: "Overview",  emoji: "📊" },
  { href: "/admin/teachers", label: "Teachers",  emoji: "👩‍🏫" },
  { href: "/admin/students", label: "Students",  emoji: "🎓" },
];

interface Props {
  schoolName: string;
  userEmail: string;
}

export default function AdminSidebar({ schoolName, userEmail }: Props) {
  const path = usePathname();

  return (
    <aside style={{
      width: 240, flexShrink: 0, background: "#0f0c1d",
      display: "flex", flexDirection: "column", minHeight: "100vh",
      borderRight: "1px solid rgba(255,255,255,.07)"
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: "linear-gradient(135deg,#6d4aff,#c849f4)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15
          }}>⚡</span>
          <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "white" }}>ClassPulse</span>
        </div>
        <div style={{
          marginTop: 6, fontSize: ".75rem", fontWeight: 700,
          background: "#eef0ff", color: "#4f3ac9",
          borderRadius: 6, padding: "2px 8px", display: "inline-block"
        }}>
          Admin
        </div>
      </div>

      {/* School name */}
      <div style={{ padding: "14px 20px 4px" }}>
        <p style={{ color: "rgba(255,255,255,.35)", fontSize: ".72rem", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 4 }}>School</p>
        <p style={{ color: "rgba(255,255,255,.75)", fontSize: ".85rem", fontWeight: 600, lineHeight: 1.4 }}>{schoolName}</p>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px" }}>
        {NAV.map(item => {
          const active = path === item.href || (item.href !== "/admin" && path.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px", borderRadius: 12, marginBottom: 2,
                textDecoration: "none", fontWeight: 600, fontSize: ".9rem",
                background: active ? "rgba(109,74,255,.22)" : "transparent",
                color: active ? "white" : "rgba(255,255,255,.5)",
                borderLeft: active ? "3px solid #6d4aff" : "3px solid transparent",
                transition: "background .15s, color .15s"
              }}
            >
              <span style={{ fontSize: 16 }}>{item.emoji}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,.07)" }}>
        <p style={{ color: "rgba(255,255,255,.35)", fontSize: ".75rem", marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {userEmail}
        </p>
        <form action="/api/auth/signout" method="POST">
          <button type="submit" style={{
            width: "100%", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)",
            borderRadius: 10, padding: "8px 14px", cursor: "pointer",
            fontSize: ".82rem", color: "rgba(255,255,255,.6)", fontWeight: 600, textAlign: "center"
          }}>
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
