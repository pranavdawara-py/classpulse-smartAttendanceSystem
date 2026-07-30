"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Tab = "signin" | "signup";

export default function PersonalModeAuth() {
  const router = useRouter();
  const [tab, setTab]         = useState<Tab>("signup");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setVerifyMsg(null);
    setLoading(true);

    const supabase = createClient();
    if (!supabase) { setError("App not configured."); setLoading(false); return; }

    if (tab === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // After clicking the verification link, return to /attend.
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/attend`
        }
      });
      if (signUpError) {
        setError(signUpError.message);
      } else if (data?.user?.identities && data.user.identities.length === 0) {
        setError("An account with this email already exists. Try signing in instead.");
      } else {
        setVerifyMsg("Check your email — click the link to activate your account, then come back here.");
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message === "Invalid login credentials"
          ? "Wrong email or password."
          : signInError.message
        );
      } else {
        router.refresh();
      }
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 400, margin: "0 auto" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 8 }}>Personal Mode</h1>
        <p style={{ color: "#78716c", fontSize: ".93rem", lineHeight: 1.55 }}>
          Take camera-based attendance independently —{" "}
          no school account needed. Create a free personal account to store your students and sessions.
        </p>
      </div>

      <div className="card" style={{ padding: "28px 28px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 12, padding: 4, marginBottom: 22 }}>
          {(["signup", "signin"] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(null); setVerifyMsg(null); }}
              style={{
                flex: 1, padding: "9px", borderRadius: 9, fontWeight: 700, fontSize: ".85rem",
                cursor: "pointer", border: "none",
                background: tab === t ? "white" : "transparent",
                color: tab === t ? "#172033" : "#64748b",
                boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,.1)" : "none"
              }}>
              {t === "signup" ? "Create account" : "Sign in"}
            </button>
          ))}
        </div>

        {verifyMsg && (
          <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: "14px 16px", marginBottom: 16, color: "#15803d", fontSize: ".9rem", fontWeight: 600 }}>
            ✉️ {verifyMsg}
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>
        )}

        {!verifyMsg && (
          <form onSubmit={handleSubmit} noValidate>
            <div className="field" style={{ marginBottom: 14 }}>
              <label htmlFor="pm-auth-email">Email address</label>
              <input id="pm-auth-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com" required disabled={loading} autoComplete="email" />
            </div>
            <div className="field" style={{ marginBottom: 22 }}>
              <label htmlFor="pm-auth-password">Password</label>
              <input id="pm-auth-password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 6 characters" required disabled={loading} autoComplete={tab === "signup" ? "new-password" : "current-password"} />
            </div>
            <button id="pm-auth-submit" type="submit" className="action" disabled={loading}
              style={{ width: "100%", minHeight: 48, background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
              {loading
                ? <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                    <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />
                    {tab === "signup" ? "Creating account…" : "Signing in…"}
                  </span>
                : tab === "signup" ? "Create personal account →" : "Sign in →"
              }
            </button>
          </form>
        )}
      </div>

      <p style={{ textAlign: "center", marginTop: 18, fontSize: ".82rem", color: "#78716c" }}>
        Already have a school account?{" "}
        <a href="/login" style={{ color: "#6d4aff", fontWeight: 700, textDecoration: "none" }}>Sign in as teacher →</a>
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
