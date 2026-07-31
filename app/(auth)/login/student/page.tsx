"use client";

// useSearchParams() requires force-dynamic — prevents build-time prerender crash in Next.js 16
export const dynamic = "force-dynamic";

/**
 * Student login page.
 *
 * Tab 1 — Student ID login:
 *   School (searchable dropdown from public institutions list)
 *   + Student ID / Roll Number + Password
 *   → constructs fake email: {studentId}@{schoolSlug}.students.classpulse.app
 *   → signInWithPassword
 *
 * Tab 2 — Email login:
 *   Standard email + password (for students who have real email addresses)
 */

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured, supabaseSetupMessage } from "@/lib/supabase/config";

const ACCENT = "#2563eb";

interface School {
  id: string;
  name: string;
  slug: string;
}

export default function StudentLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/student";

  const [tab, setTab]               = useState<"id" | "email">("id");
  const [schools, setSchools]       = useState<School[]>([]);
  const [schoolQuery, setSchoolQuery] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [studentId, setStudentId]   = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [loadingSchools, setLoadingSchools] = useState(false);

  const configured = isSupabaseConfigured();

  // Load schools on mount for the dropdown
  useEffect(() => {
    if (!configured) return;
    setLoadingSchools(true);
    const supabase = createClient();
    supabase
      .from("institutions")
      .select("id, name, slug")
      .order("name")
      .then(({ data }) => {
        setSchools((data ?? []) as School[]);
        setLoadingSchools(false);
      });
  }, [configured]);

  const filteredSchools = schools.filter(s =>
    s.name.toLowerCase().includes(schoolQuery.toLowerCase())
  );

  function selectSchool(school: School) {
    setSelectedSchool(school);
    setSchoolQuery(school.name);
    setShowDropdown(false);
    setError(null);
  }

  async function handleStudentIdLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) return;
    if (!selectedSchool) { setError("Please select your school."); return; }
    if (!studentId.trim()) { setError("Please enter your Student ID."); return; }
    if (password.length < 1) { setError("Please enter your password."); return; }

    setLoading(true);
    setError(null);
    try {
      const fakeEmail = `${studentId.trim()}@${selectedSchool.slug}.students.classpulse.app`;
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password
      });
      if (authError) throw authError;
      router.replace(nextPath);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign-in failed.";
      if (msg.includes("Invalid login credentials") || msg.includes("invalid_credentials")) {
        setError("Incorrect Student ID or password. Check your school selection and try again.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
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
      const msg = err instanceof Error ? err.message : "Sign-in failed.";
      if (msg.includes("Invalid login credentials") || msg.includes("invalid_credentials")) {
        setError("Incorrect email or password.");
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
      background: "linear-gradient(135deg,#0c1445 0%,#0d1c4d 50%,#0d1533 100%)"
    }}>
      {/* Left panel */}
      <div className="login-left-panel" style={{ flex: "0 0 45%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 56px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -80, left: -80, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle,rgba(37,99,235,.35) 0,transparent 70%)" }} />
          <div style={{ position: "absolute", bottom: 40, right: -60, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.15) 0,transparent 70%)" }} />
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}>
            <div style={{ fontSize: 36 }}>🎓</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.15rem", color: "white" }}>ClassPulse</div>
              <div style={{ fontSize: ".8rem", color: "rgba(255,255,255,.5)", marginTop: 2 }}>Student</div>
            </div>
          </div>
          <h1 style={{ fontSize: "1.9rem", fontWeight: 800, color: "white", lineHeight: 1.25, marginBottom: 32 }}>
            Welcome back,<br />
            <span style={{ background: "linear-gradient(90deg,#60a5fa,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Student.
            </span>
          </h1>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { icon: "📋", text: "Check your attendance history for every subject" },
              { icon: "📅", text: "See your class timetable and upcoming lectures" },
              { icon: "🔔", text: "Know exactly when your attendance is marked" },
              { icon: "🔒", text: "Your information is private — only your school can see it" }
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
        <Link href="/login" aria-label="Back to sign-in options" className="back-btn"
          style={{ position: "absolute", top: 20, left: 20, width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", textDecoration: "none", color: "white", backdropFilter: "blur(8px)" }}>
          ←
        </Link>

        <div style={{ width: "100%", maxWidth: 420, background: "white", borderRadius: 24, padding: "40px 36px", boxShadow: "0 32px 80px rgba(0,0,0,.45)" }}>
          <div className="login-mobile-logo" style={{ display: "none", textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 40 }}>🎓</div>
            <div style={{ fontWeight: 800, fontSize: "1.2rem", marginTop: 8 }}>ClassPulse <span style={{ color: ACCENT }}>Student</span></div>
          </div>

          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: 4 }}>Student Sign in</h2>
          <p style={{ color: "#64748b", fontSize: ".88rem", marginBottom: 20 }}>
            Your school created this account for you.
          </p>

          {/* Tabs */}
          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 12, padding: 4, marginBottom: 24 }}>
            {[
              { id: "id" as const, label: "🎓 Student ID" },
              { id: "email" as const, label: "✉️ Email" }
            ].map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setError(null); }}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 9, border: "none", cursor: "pointer",
                  fontWeight: 700, fontSize: ".82rem", transition: "all .15s",
                  background: tab === t.id ? "white" : "transparent",
                  color: tab === t.id ? "#1e293b" : "#64748b",
                  boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,.1)" : "none"
                }}>
                {t.label}
              </button>
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

          {/* ── Student ID tab ── */}
          {tab === "id" && (
            <form onSubmit={handleStudentIdLogin} noValidate>
              {/* School picker */}
              <div className="field" style={{ marginBottom: 16, position: "relative" }}>
                <label htmlFor="student-school">School</label>
                <input
                  id="student-school"
                  type="text"
                  autoComplete="off"
                  placeholder={loadingSchools ? "Loading schools…" : "Search your school…"}
                  value={schoolQuery}
                  onChange={e => { setSchoolQuery(e.target.value); setSelectedSchool(null); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  disabled={loading || !configured}
                />
                {showDropdown && filteredSchools.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #dbe3ef", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.12)", zIndex: 50, maxHeight: 200, overflowY: "auto", marginTop: 4 }}>
                    {filteredSchools.map(s => (
                      <button key={s.id} type="button" onClick={() => selectSchool(s)}
                        style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: "none", cursor: "pointer", fontSize: ".88rem", color: "#1e293b" }}
                        onMouseDown={e => e.preventDefault()}>
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
                {showDropdown && schoolQuery.length > 1 && filteredSchools.length === 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #dbe3ef", borderRadius: 12, padding: "10px 14px", fontSize: ".83rem", color: "#94a3b8", marginTop: 4 }}>
                    No school found for "{schoolQuery}"
                  </div>
                )}
              </div>

              <div className="field" style={{ marginBottom: 16 }}>
                <label htmlFor="student-id-field">Student ID / Roll Number</label>
                <input id="student-id-field" type="text" autoComplete="username" required
                  placeholder="e.g. 42 or 2023CSE042"
                  value={studentId} onChange={e => { setStudentId(e.target.value); setError(null); }}
                  disabled={loading || !configured} />
              </div>

              <div className="field" style={{ marginBottom: 28, position: "relative" }}>
                <label htmlFor="student-id-password">Password</label>
                <input id="student-id-password" type={showPw ? "text" : "password"} autoComplete="current-password" required
                  placeholder="Your password"
                  value={password} onChange={e => { setPassword(e.target.value); setError(null); }}
                  disabled={loading || !configured} style={{ paddingRight: 48 }} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  style={{ position: "absolute", right: 12, bottom: 11, background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4, fontSize: "1.1rem" }}>
                  {showPw ? "🙈" : "👁"}
                </button>
              </div>

              <button id="student-id-submit" type="submit" className="action"
                disabled={loading || !configured || !selectedSchool || !studentId || !password}
                style={{ width: "100%", minHeight: 50, fontSize: "1rem", background: `linear-gradient(135deg,${ACCENT},${ACCENT}cc)` }}>
                {loading ? <Spinner /> : "Sign in →"}
              </button>
            </form>
          )}

          {/* ── Email tab ── */}
          {tab === "email" && (
            <form onSubmit={handleEmailLogin} noValidate>
              <div className="field" style={{ marginBottom: 16 }}>
                <label htmlFor="student-email-field">Email address</label>
                <input id="student-email-field" type="email" autoComplete="email" required
                  placeholder="your@email.com"
                  value={email} onChange={e => { setEmail(e.target.value); setError(null); }}
                  disabled={loading || !configured} />
              </div>

              <div className="field" style={{ marginBottom: 28, position: "relative" }}>
                <label htmlFor="student-email-password">Password</label>
                <input id="student-email-password" type={showPw ? "text" : "password"} autoComplete="current-password" required
                  placeholder="Your password"
                  value={password} onChange={e => { setPassword(e.target.value); setError(null); }}
                  disabled={loading || !configured} style={{ paddingRight: 48 }} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  style={{ position: "absolute", right: 12, bottom: 11, background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4, fontSize: "1.1rem" }}>
                  {showPw ? "🙈" : "👁"}
                </button>
              </div>

              <button id="student-email-submit" type="submit" className="action"
                disabled={loading || !configured || !email || !password}
                style={{ width: "100%", minHeight: 50, fontSize: "1rem", background: `linear-gradient(135deg,${ACCENT},${ACCENT}cc)` }}>
                {loading ? <Spinner /> : "Sign in →"}
              </button>
            </form>
          )}

          <p style={{ textAlign: "center", fontSize: ".83rem", color: "#94a3b8", marginTop: 20 }}>
            Don&apos;t have an account? Ask your school administrator to create one.
          </p>
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

function Spinner() {
  return (
    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <span style={{ width: 18, height: 18, border: "2.5px solid rgba(255,255,255,.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />
      Signing in…
    </span>
  );
}
