"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured, supabaseSetupMessage } from "@/lib/supabase/config";

// Minimal IANA timezone list for Indian schools — can be expanded
const TIMEZONES = [
  { value: "Asia/Kolkata", label: "India Standard Time (IST, UTC+5:30)" },
  { value: "Asia/Colombo", label: "Sri Lanka Standard Time (UTC+5:30)" },
  { value: "Asia/Dhaka", label: "Bangladesh Standard Time (UTC+6)" },
  { value: "Asia/Karachi", label: "Pakistan Standard Time (UTC+5)" },
  { value: "Asia/Dubai", label: "Gulf Standard Time (UTC+4)" },
  { value: "Asia/Singapore", label: "Singapore Time (UTC+8)" },
  { value: "UTC", label: "UTC" }
];

export default function SignupPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();

  const [step, setStep] = useState<"account" | "school">("account");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setError(null); }, [email, password, confirmPassword, schoolName]);

  // ── Step 1: Create auth account ──────────────────────────────────────────
  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) return;
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;
      setStep("school");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign-up failed.";
      if (msg.includes("already registered") || msg.includes("already exists")) {
        setError("An account with this email already exists. Try signing in.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: Create institution via bootstrap_institution() RPC ────────────
  async function handleSchoolSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) return;
    if (schoolName.trim().length < 2) { setError("School name must be at least 2 characters."); return; }
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("bootstrap_institution", {
        institution_name: schoolName.trim(),
        institution_timezone: timezone
      });
      if (rpcError) throw rpcError;
      // Refresh session so profile role is updated in the JWT
      await supabase.auth.refreshSession();
      router.replace("/admin");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "School setup failed.";
      if (msg.includes("already assigned")) {
        setError("This account is already linked to an institution. Redirecting…");
        setTimeout(() => router.replace("/dashboard"), 1500);
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
      {/* Left branding panel — hidden on mobile */}
      <div style={{
        flex: "0 0 45%", display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "48px 56px", position: "relative", overflow: "hidden"
      }} className="signup-left-panel">
        {/* Blobs */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -80, left: -80, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle,rgba(109,74,255,.35) 0,transparent 70%)" }} />
          <div style={{ position: "absolute", bottom: 40, right: -60, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle,rgba(200,73,244,.2) 0,transparent 70%)" }} />
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}>
            <LogoMark size={44} />
            <span style={{ fontSize: "1.5rem", fontWeight: 800, background: "linear-gradient(90deg,#a78bfa,#f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ClassPulse</span>
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, lineHeight: 1.25, color: "white", marginBottom: 16 }}>
            Set up your school<br />
            <span style={{ background: "linear-gradient(90deg,#818cf8,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>in 2 minutes.</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,.6)", fontSize: ".95rem", lineHeight: 1.6, marginBottom: 40, maxWidth: 340 }}>
            Create your school account, then add teachers and students. Camera-based attendance is ready to use right away.
          </p>

          {/* Progress indicator */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <StepIndicator num={1} label="Create your account" done={step === "school"} active={step === "account"} />
            <StepIndicator num={2} label="Set up your school" done={false} active={step === "school"} />
            <StepIndicator num={3} label="Start adding teachers & students" done={false} active={false} />
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
        <div style={{ width: "100%", maxWidth: 420, background: "white", borderRadius: 24, padding: "40px 36px", boxShadow: "0 32px 80px rgba(0,0,0,.45)" }}>

          {/* Mobile logo */}
          <div className="signup-mobile-logo" style={{ display: "none", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
            <LogoMark size={48} />
            <span style={{ fontSize: "1.4rem", fontWeight: 800, marginTop: 10, background: "linear-gradient(90deg,#6d4aff,#c849f4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ClassPulse</span>
          </div>

          {/* Step pill */}
          <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
            {(["account", "school"] as const).map((s, i) => (
              <div key={s} style={{
                height: 4, flex: 1, borderRadius: 4,
                background: step === "school" || i === 0 ? "#6d4aff" : "#e7edf5",
                transition: "background .3s"
              }} />
            ))}
          </div>

          {!configured && (
            <div className="alert alert-warning" style={{ marginBottom: 20 }} role="alert">
              <strong>Setup required.</strong> {supabaseSetupMessage}
            </div>
          )}

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 20 }} role="alert">{error}</div>
          )}

          {/* ── STEP 1: Account ── */}
          {step === "account" && (
            <>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: 4 }}>Create your account</h2>
              <p style={{ color: "#64748b", fontSize: ".9rem", marginBottom: 24 }}>This will be the school administrator account.</p>

              <form onSubmit={handleAccountSubmit} noValidate>
                <div className="field" style={{ marginBottom: 14 }}>
                  <label htmlFor="signup-email">Email address</label>
                  <input id="signup-email" type="email" autoComplete="email" required placeholder="school@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={loading || !configured} />
                </div>
                <div className="field" style={{ marginBottom: 14, position: "relative" }}>
                  <label htmlFor="signup-password">Password</label>
                  <input id="signup-password" type={showPw ? "text" : "password"} autoComplete="new-password" required placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} disabled={loading || !configured} style={{ paddingRight: 48 }} />
                  <button type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? "Hide password" : "Show password"} style={{ position: "absolute", right: 12, bottom: 11, background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4, fontSize: "1.1rem" }}>
                    {showPw ? "🙈" : "👁"}
                  </button>
                </div>
                <div className="field" style={{ marginBottom: 24 }}>
                  <label htmlFor="signup-confirm-password">Confirm password</label>
                  <input id="signup-confirm-password" type="password" autoComplete="new-password" required placeholder="Repeat password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={loading || !configured} />
                </div>
                <button id="signup-account-submit" type="submit" className="action" disabled={loading || !configured || !email || !password || !confirmPassword} style={{ width: "100%", minHeight: 50, fontSize: "1rem" }}>
                  {loading ? <Spinner /> : "Continue →"}
                </button>
              </form>

              <p style={{ textAlign: "center", marginTop: 20, fontSize: ".85rem", color: "#94a3b8" }}>
                Already have an account?{" "}
                <Link href="/login" style={{ color: "#6d4aff", fontWeight: 700, textDecoration: "none" }}>Sign in</Link>
              </p>
            </>
          )}

          {/* ── STEP 2: School ── */}
          {step === "school" && (
            <>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: 4 }}>Set up your school</h2>
              <p style={{ color: "#64748b", fontSize: ".9rem", marginBottom: 24 }}>You can update these details later from your dashboard.</p>

              <form onSubmit={handleSchoolSubmit} noValidate>
                <div className="field" style={{ marginBottom: 14 }}>
                  <label htmlFor="signup-school-name">School / institution name</label>
                  <input id="signup-school-name" type="text" required placeholder="e.g. Sunrise Public School" value={schoolName} onChange={e => setSchoolName(e.target.value)} disabled={loading} autoFocus />
                </div>
                <div className="field" style={{ marginBottom: 24 }}>
                  <label htmlFor="signup-timezone">Timezone</label>
                  <select id="signup-timezone" value={timezone} onChange={e => setTimezone(e.target.value)} disabled={loading} style={{ minHeight: 46, border: "1px solid #dbe3ef", borderRadius: 12, padding: "0 13px", outline: "none", background: "#fff" }}>
                    {TIMEZONES.map(tz => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                </div>
                <button id="signup-school-submit" type="submit" className="action" disabled={loading || schoolName.trim().length < 2} style={{ width: "100%", minHeight: 50, fontSize: "1rem" }}>
                  {loading ? <Spinner /> : "🏫 Create school & continue"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 700px) {
          .signup-left-panel { display: none !important; }
          .signup-mobile-logo { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect width="40" height="40" rx="12" fill="url(#slg)" />
      <path d="M12 20a8 8 0 1 1 16 0" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <circle cx="20" cy="20" r="3.5" fill="white" />
      <path d="M20 16.5V11" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <defs>
        <linearGradient id="slg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6d4aff" /><stop offset="1" stopColor="#c849f4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function StepIndicator({ num, label, done, active }: { num: number; label: string; done: boolean; active: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: ".8rem", fontWeight: 800,
        background: done ? "#28c7a2" : active ? "#6d4aff" : "rgba(255,255,255,.1)",
        color: done || active ? "white" : "rgba(255,255,255,.4)",
        border: active ? "2px solid rgba(255,255,255,.3)" : "none",
        transition: "background .3s"
      }}>
        {done ? "✓" : num}
      </div>
      <span style={{ fontSize: ".9rem", color: active ? "white" : done ? "rgba(255,255,255,.7)" : "rgba(255,255,255,.35)", fontWeight: active ? 700 : 400 }}>{label}</span>
    </div>
  );
}

function Spinner() {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 18, height: 18, border: "2.5px solid rgba(255,255,255,.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />
      Setting up…
    </span>
  );
}
