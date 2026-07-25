"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured, supabaseSetupMessage } from "@/lib/supabase/config";

// ─── Logo mark ───────────────────────────────────────────────────────────────
function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect width="40" height="40" rx="12" fill="url(#lg)" />
      <path d="M12 20a8 8 0 1 1 16 0" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <circle cx="20" cy="20" r="3.5" fill="white" />
      <path d="M20 16.5V11" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6d4aff" />
          <stop offset="1" stopColor="#c849f4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Feature bullet ───────────────────────────────────────────────────────────
function Feature({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{
        width: 36, height: 36, borderRadius: 10,
        background: "rgba(109,74,255,.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, flexShrink: 0
      }}>{icon}</span>
      <span style={{ fontSize: ".93rem", color: "rgba(255,255,255,.82)", lineHeight: 1.4 }}>{text}</span>
    </div>
  );
}

// ─── Login page ───────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  const configured = isSupabaseConfigured();

  // Show errors passed from auth callback (e.g. expired link, bootstrap failure)
  const callbackError = searchParams.get("error");
  const callbackErrorMsg: Record<string, string> = {
    link_expired: "Your verification link has expired. Please sign up again.",
    invalid_link: "Invalid verification link. Please try again.",
    bootstrap_failed: "School setup failed after verification. Please contact support.",
    not_configured: "Server configuration error. Please contact support."
  };

  // Reset error when inputs change
  useEffect(() => { setError(null); }, [email, password]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      router.replace(nextPath);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign-in failed. Please try again.";
      // Map Supabase error messages to friendlier text
      if (msg.includes("Invalid login credentials")) {
        setError("Incorrect email or password.");
      } else if (msg.includes("Email not confirmed")) {
        setError("Please confirm your email address before signing in.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "linear-gradient(135deg,#0f0922 0%,#1a0a3d 50%,#0d1533 100%)"
    }}>
      {/* ── Left panel: branding (hidden on mobile) ── */}
      <div style={{
        flex: "0 0 45%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "48px 56px",
        position: "relative",
        overflow: "hidden"
      }} className="login-left-panel">
        {/* Decorative blobs */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden"
        }}>
          <div style={{
            position: "absolute", top: "-80px", left: "-80px",
            width: 340, height: 340, borderRadius: "50%",
            background: "radial-gradient(circle,rgba(109,74,255,.35) 0,transparent 70%)"
          }} />
          <div style={{
            position: "absolute", bottom: 40, right: -60,
            width: 260, height: 260, borderRadius: "50%",
            background: "radial-gradient(circle,rgba(200,73,244,.2) 0,transparent 70%)"
          }} />
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}>
            <LogoMark size={44} />
            <span style={{
              fontSize: "1.5rem", fontWeight: 800,
              background: "linear-gradient(90deg,#a78bfa,#f472b6)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
            }}>ClassPulse</span>
          </div>

          <h1 style={{
            fontSize: "2.25rem", fontWeight: 800, lineHeight: 1.2,
            color: "white", marginBottom: 16
          }}>
            AI-assisted attendance,<br />
            <span style={{
              background: "linear-gradient(90deg,#818cf8,#c084fc)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
            }}>teacher-confirmed.</span>
          </h1>
          <p style={{
            color: "rgba(255,255,255,.6)", fontSize: ".97rem",
            lineHeight: 1.6, marginBottom: 40, maxWidth: 340
          }}>
            Camera-based face recognition suggests attendance. You stay in control — review, correct, and confirm every session.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Feature icon="📷" text="Live camera or uploaded video — same pipeline" />
            <Feature icon="✅" text="Every suggestion is reviewable before it's saved" />
            <Feature icon="🔒" text="Private biometric storage with full audit trail" />
            <Feature icon="⚡" text="Faster than manual roll call, safer than automation" />
          </div>
        </div>
      </div>

      {/* ── Right panel: login card ── */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px"
      }}>
        <div style={{
          width: "100%",
          maxWidth: 420,
          background: "white",
          borderRadius: 24,
          padding: "40px 36px",
          boxShadow: "0 32px 80px rgba(0,0,0,.45)"
        }}>
          {/* Mobile logo */}
          <div className="login-mobile-logo" style={{
            display: "none", flexDirection: "column",
            alignItems: "center", marginBottom: 28
          }}>
            <LogoMark size={48} />
            <span style={{
              fontSize: "1.4rem", fontWeight: 800, marginTop: 10,
              background: "linear-gradient(90deg,#6d4aff,#c849f4)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
            }}>ClassPulse</span>
          </div>

          <h2 style={{
            fontSize: "1.45rem", fontWeight: 800,
            color: "#172033", marginBottom: 4
          }}>Welcome back</h2>
          <p style={{ color: "#64748b", fontSize: ".9rem", marginBottom: 28 }}>
            Sign in to your ClassPulse account
          </p>

          {/* Supabase not configured banner */}
          {!configured && (
            <div className="alert alert-warning" style={{ marginBottom: 20 }} role="alert">
              <strong>Setup required.</strong> {supabaseSetupMessage}
            </div>
          )}

          {/* Callback error (from email verification redirect) */}
          {callbackError && callbackErrorMsg[callbackError] && (
            <div className="alert alert-error" style={{ marginBottom: 20 }} role="alert">
              {callbackErrorMsg[callbackError]}
            </div>
          )}

          {/* Sign-in error */}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 20 }} role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="field" style={{ marginBottom: 16 }}>
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                placeholder="teacher@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || !configured}
              />
            </div>

            <div className="field" style={{ marginBottom: 24, position: "relative" }}>
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || !configured}
                style={{ paddingRight: 48 }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
                style={{
                  position: "absolute", right: 12, bottom: 11,
                  background: "none", border: "none", cursor: "pointer",
                  color: "#64748b", padding: 4, fontSize: "1.1rem"
                }}
              >
                {showPw ? "🙈" : "👁"}
              </button>
            </div>

            <button
              id="login-submit"
              type="submit"
              className="action"
              disabled={loading || !configured || !email || !password}
              style={{ width: "100%", minHeight: 50, fontSize: "1rem", borderRadius: 14 }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    width: 18, height: 18, border: "2.5px solid rgba(255,255,255,.3)",
                    borderTopColor: "white", borderRadius: "50%",
                    animation: "spin .7s linear infinite", display: "inline-block"
                  }} />
                  Signing in…
                </span>
              ) : "Sign in"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: 24, fontSize: ".83rem", color: "#94a3b8" }}>
            New school?{" "}
            <Link href="/signup" style={{ color: "#6d4aff", fontWeight: 700, textDecoration: "none" }}>Register your school</Link>
          </p>
          <p style={{ textAlign: "center", marginTop: 8, fontSize: ".83rem", color: "#94a3b8" }}>
            Teachers and students: contact your school administrator for access.
          </p>
        </div>
      </div>

      {/* Responsive styles + spinner animation */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 700px) {
          .login-left-panel { display: none !important; }
          .login-mobile-logo { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
