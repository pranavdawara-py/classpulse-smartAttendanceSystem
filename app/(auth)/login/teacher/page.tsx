import type { Metadata } from "next";
import Link from "next/link";
import { RoleLoginForm } from "../_components/RoleLoginForm";

export const metadata: Metadata = {
  title: "Teacher Sign In — ClassPulse",
  description: "Sign in to your ClassPulse teacher account to mark and manage attendance."
};

const ACCENT = "#0d9488";

export default function TeacherLoginPage() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      background: "linear-gradient(135deg,#042f2e 0%,#0d2f2a 50%,#0d1533 100%)"
    }}>
      {/* Left panel */}
      <div className="login-left-panel" style={{ flex: "0 0 45%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 56px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -80, left: -80, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle,rgba(13,148,136,.35) 0,transparent 70%)" }} />
          <div style={{ position: "absolute", bottom: 40, right: -60, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle,rgba(20,184,166,.15) 0,transparent 70%)" }} />
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}>
            <div style={{ fontSize: 36 }}>👩‍🏫</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.15rem", color: "white" }}>ClassPulse</div>
              <div style={{ fontSize: ".8rem", color: "rgba(255,255,255,.5)", marginTop: 2 }}>Teacher</div>
            </div>
          </div>
          <h1 style={{ fontSize: "1.9rem", fontWeight: 800, color: "white", lineHeight: 1.25, marginBottom: 32 }}>
            Welcome back,<br />
            <span style={{ background: "linear-gradient(90deg,#2dd4bf,#34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Teacher.
            </span>
          </h1>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { icon: "📸", text: "Mark attendance instantly using your phone camera" },
              { icon: "📁", text: "Upload a class recording to mark attendance later" },
              { icon: "✏️", text: "Easily review and adjust attendance before saving" },
              { icon: "📅", text: "View your class schedule and upcoming lectures" }
            ].map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{f.icon}</span>
                <span style={{ color: "rgba(255,255,255,.7)", fontSize: ".9rem", lineHeight: 1.5 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 24px", position: "relative" }}>
        {/* Back button — top left */}
        <Link
          href="/login"
          aria-label="Back to sign-in options"
          className="back-btn"
          style={{
            position: "absolute", top: 20, left: 20,
            width: 40, height: 40, borderRadius: "50%",
            background: "rgba(255,255,255,.12)",
            border: "1px solid rgba(255,255,255,.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.1rem", textDecoration: "none", color: "white",
            backdropFilter: "blur(8px)"
          }}
        >
          ←
        </Link>

        <div style={{ width: "100%", maxWidth: 420, background: "white", borderRadius: 24, padding: "40px 36px", boxShadow: "0 32px 80px rgba(0,0,0,.45)" }}>
          <div className="login-mobile-logo" style={{ display: "none", textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 40 }}>👩‍🏫</div>
            <div style={{ fontWeight: 800, fontSize: "1.2rem", marginTop: 8 }}>ClassPulse <span style={{ color: ACCENT }}>Teacher</span></div>
          </div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: 4 }}>Sign in</h2>
          <p style={{ color: "#64748b", fontSize: ".9rem", marginBottom: 28 }}>
            Teacher account — your school created this for you
          </p>
          <RoleLoginForm
            roleId="teacher"
            accent={ACCENT}
            expectedPath="/teacher"
            footer={
              <p style={{ textAlign: "center", fontSize: ".83rem", color: "#94a3b8" }}>
                Don&apos;t have an account? Ask your school administrator to create one.
              </p>
            }
          />
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .back-btn:hover { background: rgba(255,255,255,.22) !important; }
        @media (max-width: 700px) {
          .login-left-panel { display: none !important; }
          .login-mobile-logo { display: block !important; }
        }
      `}</style>
    </div>
  );
}
