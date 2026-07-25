"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured, supabaseSetupMessage } from "@/lib/supabase/config";

const TIMEZONES = [
  { value: "Asia/Kolkata", label: "India Standard Time (IST, UTC+5:30)" },
  { value: "Asia/Colombo", label: "Sri Lanka Standard Time (UTC+5:30)" },
  { value: "Asia/Dhaka", label: "Bangladesh Standard Time (UTC+6)" },
  { value: "Asia/Karachi", label: "Pakistan Standard Time (UTC+5)" },
  { value: "Asia/Dubai", label: "Gulf Standard Time (UTC+4)" },
  { value: "Asia/Singapore", label: "Singapore Time (UTC+8)" },
  { value: "UTC", label: "UTC" }
];

type Step = "account" | "school" | "verify";

export default function SignupPage() {
  const configured = isSupabaseConfigured();

  // All form state collected before any API call
  const [step, setStep] = useState<Step>("account");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setError(null); }, [email, password, confirmPassword, schoolName]);

  // ── Step 1 → Step 2: purely UI, no API call ──────────────────────────────
  function handleAccountNext(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setError(null);
    setStep("school");
  }

  // ── Step 2: call signUp() with school metadata, send verification email ──
  async function handleSchoolSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) return;
    if (schoolName.trim().length < 2) { setError("School name must be at least 2 characters."); return; }
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      // Store school data in user metadata so the /auth/callback route can
      // call bootstrap_institution() after email confirmation.
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            school_name: schoolName.trim(),
            school_timezone: timezone
          },
          // Supabase sends the confirmation link; callback bootstraps the school.
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (authError) throw authError;
      setStep("verify");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign-up failed.";
      if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("already been registered")) {
        setError("An account with this email already exists. Try signing in instead.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      background: "linear-gradient(135deg,#0f0922 0%,#1a0a3d 50%,#0d1533 100%)"
    }}>
      {/* ── Left branding (hidden on mobile) ── */}
      <div className="signup-left-panel" style={{
        flex: "0 0 45%", display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "48px 56px",
        position: "relative", overflow: "hidden"
      }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -80, left: -80, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle,rgba(109,74,255,.35) 0,transparent 70%)" }} />
          <div style={{ position: "absolute", bottom: 40, right: -60, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle,rgba(200,73,244,.2) 0,transparent 70%)" }} />
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <LogoMark size={44} />
          <h1 style={{ fontSize: "2rem", fontWeight: 800, lineHeight: 1.25, color: "white", marginTop: 28, marginBottom: 16 }}>
            Set up your school<br />
            <span style={{ background: "linear-gradient(90deg,#818cf8,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>in 2 minutes.</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,.6)", fontSize: ".95rem", lineHeight: 1.6, marginBottom: 40, maxWidth: 340 }}>
            Create your school account, add teachers and students, then start marking camera-based attendance — all from your phone.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <StepDot num={1} label="Create your account" done={step !== "account"} active={step === "account"} />
            <StepDot num={2} label="Name your school" done={step === "verify"} active={step === "school"} />
            <StepDot num={3} label="Verify your email" done={false} active={step === "verify"} />
            <StepDot num={4} label="Start adding teachers &amp; students" done={false} active={false} />
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
        <div style={{ width: "100%", maxWidth: 420, background: "white", borderRadius: 24, padding: "40px 36px", boxShadow: "0 32px 80px rgba(0,0,0,.45)" }}>

          {/* Mobile logo */}
          <div className="signup-mobile-logo" style={{ display: "none", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
            <LogoMark size={48} />
          </div>

          {/* Step progress bar */}
          {step !== "verify" && (
            <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
              <div style={{ height: 4, flex: 1, borderRadius: 4, background: "#6d4aff" }} />
              <div style={{ height: 4, flex: 1, borderRadius: 4, background: step === "school" ? "#6d4aff" : "#e7edf5", transition: "background .3s" }} />
            </div>
          )}

          {!configured && (
            <div className="alert alert-warning" style={{ marginBottom: 20 }} role="alert">
              <strong>Setup required.</strong> {supabaseSetupMessage}
            </div>
          )}
          {error && <div className="alert alert-error" style={{ marginBottom: 20 }} role="alert">{error}</div>}

          {/* ── STEP 1: Account details ── */}
          {step === "account" && (
            <>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: 4 }}>Create your account</h2>
              <p style={{ color: "#64748b", fontSize: ".9rem", marginBottom: 24 }}>This will be the school administrator account.</p>
              <form onSubmit={handleAccountNext} noValidate>
                <div className="field" style={{ marginBottom: 14 }}>
                  <label htmlFor="signup-email">Email address</label>
                  <input id="signup-email" type="email" autoComplete="email" required placeholder="school@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={!configured} />
                </div>
                <div className="field" style={{ marginBottom: 14, position: "relative" }}>
                  <label htmlFor="signup-password">Password</label>
                  <input id="signup-password" type={showPw ? "text" : "password"} autoComplete="new-password" required placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} style={{ paddingRight: 48 }} />
                  <button type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? "Hide" : "Show"} style={{ position: "absolute", right: 12, bottom: 11, background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4, fontSize: "1.1rem" }}>
                    {showPw ? "🙈" : "👁"}
                  </button>
                </div>
                <div className="field" style={{ marginBottom: 28 }}>
                  <label htmlFor="signup-confirm-password">Confirm password</label>
                  <input id="signup-confirm-password" type="password" autoComplete="new-password" required placeholder="Repeat password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                </div>
                <button id="signup-account-next" type="submit" className="action" disabled={!configured || !email || !password || !confirmPassword} style={{ width: "100%", minHeight: 50, fontSize: "1rem" }}>
                  Continue →
                </button>
              </form>
              <p style={{ textAlign: "center", marginTop: 20, fontSize: ".85rem", color: "#94a3b8" }}>
                Already have an account?{" "}
                <Link href="/login" style={{ color: "#6d4aff", fontWeight: 700, textDecoration: "none" }}>Sign in</Link>
              </p>
            </>
          )}

          {/* ── STEP 2: School details ── */}
          {step === "school" && (
            <>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: 4 }}>Name your school</h2>
              <p style={{ color: "#64748b", fontSize: ".9rem", marginBottom: 24 }}>
                We&apos;ll send a verification link to <strong>{email}</strong> after this step.
              </p>
              <form onSubmit={handleSchoolSubmit} noValidate>
                <div className="field" style={{ marginBottom: 14 }}>
                  <label htmlFor="signup-school-name">School / institution name</label>
                  <input id="signup-school-name" type="text" required placeholder="e.g. Sunrise Public School" value={schoolName} onChange={e => setSchoolName(e.target.value)} disabled={loading} autoFocus />
                </div>
                <div className="field" style={{ marginBottom: 28 }}>
                  <label htmlFor="signup-timezone">Timezone</label>
                  <select id="signup-timezone" value={timezone} onChange={e => setTimezone(e.target.value)} disabled={loading} style={{ minHeight: 46, border: "1px solid #dbe3ef", borderRadius: 12, padding: "0 13px", outline: "none", background: "#fff", width: "100%" }}>
                    {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                  </select>
                </div>
                <button id="signup-school-submit" type="submit" className="action" disabled={loading || !configured || schoolName.trim().length < 2} style={{ width: "100%", minHeight: 50, fontSize: "1rem" }}>
                  {loading ? <Spinner text="Sending verification email…" /> : "🏫 Create school & verify email"}
                </button>
                <button type="button" onClick={() => { setError(null); setStep("account"); }} style={{ width: "100%", marginTop: 10, background: "none", border: "none", color: "#64748b", fontSize: ".88rem", cursor: "pointer", padding: "8px 0" }}>
                  ← Back
                </button>
              </form>
            </>
          )}

          {/* ── STEP 3: Check email ── */}
          {step === "verify" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>📬</div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: 8 }}>Check your email</h2>
              <p style={{ color: "#64748b", fontSize: ".93rem", lineHeight: 1.6, marginBottom: 24 }}>
                We sent a verification link to<br />
                <strong style={{ color: "#172033" }}>{email}</strong>
              </p>
              <div className="alert" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", marginBottom: 24, textAlign: "left" }}>
                <strong>What happens next:</strong><br />
                Click the link in the email → your school account will be created automatically → you&apos;ll be taken to your school dashboard.
              </div>
              <p style={{ fontSize: ".83rem", color: "#94a3b8" }}>
                Didn&apos;t receive it? Check your spam folder.<br />
                Wrong email?{" "}
                <button onClick={() => { setStep("account"); setError(null); }} style={{ background: "none", border: "none", color: "#6d4aff", fontWeight: 700, cursor: "pointer", padding: 0, fontSize: "inherit" }}>
                  Start over
                </button>
              </p>
            </div>
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
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
        <rect width="40" height="40" rx="12" fill="url(#slg2)" />
        <path d="M12 20a8 8 0 1 1 16 0" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <circle cx="20" cy="20" r="3.5" fill="white" />
        <path d="M20 16.5V11" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <defs>
          <linearGradient id="slg2" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6d4aff" /><stop offset="1" stopColor="#c849f4" />
          </linearGradient>
        </defs>
      </svg>
      <span style={{ fontSize: "1.5rem", fontWeight: 800, background: "linear-gradient(90deg,#a78bfa,#f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ClassPulse</span>
    </div>
  );
}

function StepDot({ num, label, done, active }: { num: number; label: string; done: boolean; active: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".8rem", fontWeight: 800, background: done ? "#28c7a2" : active ? "#6d4aff" : "rgba(255,255,255,.1)", color: done || active ? "white" : "rgba(255,255,255,.4)", transition: "background .3s" }}>
        {done ? "✓" : num}
      </div>
      <span style={{ fontSize: ".9rem", color: active ? "white" : done ? "rgba(255,255,255,.7)" : "rgba(255,255,255,.35)", fontWeight: active ? 700 : 400 }} dangerouslySetInnerHTML={{ __html: label }} />
    </div>
  );
}

function Spinner({ text }: { text: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <span style={{ width: 18, height: 18, border: "2.5px solid rgba(255,255,255,.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />
      {text}
    </span>
  );
}
