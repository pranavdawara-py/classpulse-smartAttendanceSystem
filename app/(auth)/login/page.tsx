import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — ClassPulse",
  description: "Sign in to ClassPulse. Choose your role to continue."
};

const ROLES = [
  {
    href: "/login/school",
    emoji: "🏫",
    label: "School",
    description: "School administrator — manage teachers, students, and attendance records",
    accent: "#6d4aff",
    bg: "#f3f0ff",
    border: "#c4b5fd"
  },
  {
    href: "/login/teacher",
    emoji: "👩‍🏫",
    label: "Teacher",
    description: "Mark attendance, view your class schedule, and review student records",
    accent: "#0d9488",
    bg: "#f0fdfa",
    border: "#5eead4"
  },
  {
    href: "/login/student",
    emoji: "🎓",
    label: "Student",
    description: "View your attendance record and class timetable",
    accent: "#2563eb",
    bg: "#eff6ff",
    border: "#93c5fd"
  }
] as const;

export default function LoginPickerPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg,#0f0922 0%,#1a0a3d 50%,#0d1533 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "32px 20px"
    }}>
      {/* Background blobs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -100, left: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(109,74,255,.25) 0,transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: -60, right: -60, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle,rgba(200,73,244,.15) 0,transparent 70%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 560 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <svg width={44} height={44} viewBox="0 0 40 40" fill="none" aria-hidden>
              <rect width="40" height="40" rx="12" fill="url(#plg)" />
              <path d="M12 20a8 8 0 1 1 16 0" stroke="white" strokeWidth="3" strokeLinecap="round" />
              <circle cx="20" cy="20" r="3.5" fill="white" />
              <path d="M20 16.5V11" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <defs>
                <linearGradient id="plg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6d4aff" /><stop offset="1" stopColor="#c849f4" />
                </linearGradient>
              </defs>
            </svg>
            <span style={{ fontSize: "1.8rem", fontWeight: 800, background: "linear-gradient(90deg,#a78bfa,#f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              ClassPulse
            </span>
          </div>
          <h1 style={{ color: "white", fontSize: "1.5rem", fontWeight: 800, marginBottom: 8 }}>
            Welcome back
          </h1>
          <p style={{ color: "rgba(255,255,255,.55)", fontSize: ".95rem" }}>
            Who are you signing in as?
          </p>
        </div>

        {/* Role cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {ROLES.map(role => (
            <Link
              key={role.href}
              href={role.href}
              id={`login-role-${role.label.toLowerCase()}`}
              className="role-card"
              style={{
                display: "flex", alignItems: "center", gap: 18,
                background: "rgba(255,255,255,.06)",
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: 20, padding: "20px 22px",
                textDecoration: "none",
                backdropFilter: "blur(12px)"
              }}
            >
              {/* Icon */}
              <div style={{
                width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                background: role.bg, border: `1.5px solid ${role.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26
              }}>
                {role.emoji}
              </div>

              {/* Text */}
              <div style={{ flex: 1 }}>
                <p style={{ color: "white", fontWeight: 800, fontSize: "1.05rem", marginBottom: 3 }}>
                  {role.label}
                </p>
                <p style={{ color: "rgba(255,255,255,.5)", fontSize: ".83rem", lineHeight: 1.4 }}>
                  {role.description}
                </p>
              </div>

              {/* Arrow */}
              <span style={{ color: "rgba(255,255,255,.3)", fontSize: "1.2rem", flexShrink: 0 }}>→</span>
            </Link>
          ))}
        </div>

        <style>{`
          .role-card { transition: background .2s, border-color .2s, transform .15s; }
          .role-card:hover {
            background: rgba(255,255,255,.13) !important;
            border-color: rgba(255,255,255,.25) !important;
            transform: translateY(-2px);
          }
        `}</style>

        {/* New school link */}
        <p style={{ textAlign: "center", marginTop: 32, fontSize: ".85rem", color: "rgba(255,255,255,.4)" }}>
          New school?{" "}
          <Link href="/signup" style={{ color: "#a78bfa", fontWeight: 700, textDecoration: "none" }}>
            Register your school →
          </Link>
        </p>
      </div>
    </div>
  );
}
