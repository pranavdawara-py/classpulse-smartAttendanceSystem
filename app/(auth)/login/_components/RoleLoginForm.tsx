"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured, supabaseSetupMessage } from "@/lib/supabase/config";

const CALLBACK_ERRORS: Record<string, string> = {
  link_expired: "Your verification link has expired. Please sign up again.",
  invalid_link: "Invalid verification link. Please try again.",
  bootstrap_failed: "School setup failed after verification. Please contact support.",
  not_configured: "Server configuration error. Please contact support."
};

interface RoleLoginFormProps {
  /** Role identifier for accessible IDs */
  roleId: string;
  /** Colour accent for primary button and focus ring */
  accent: string;
  /** Where to redirect after successful login (validated server-side too) */
  expectedPath: string;
  /** Footer slot rendered below the form */
  footer?: React.ReactNode;
}

export function RoleLoginForm({ roleId, accent, expectedPath, footer }: RoleLoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? expectedPath;
  const callbackError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configured = isSupabaseConfigured();
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
      const msg = err instanceof Error ? err.message : "Sign-in failed.";
      if (msg.includes("Invalid login credentials") || msg.includes("invalid_credentials")) {
        setError("Incorrect email or password. Please try again.");
      } else if (msg.includes("Email not confirmed")) {
        setError("Please check your email and click the verification link first.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {!configured && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }} role="alert">
          <strong>Setup required.</strong> {supabaseSetupMessage}
        </div>
      )}
      {callbackError && CALLBACK_ERRORS[callbackError] && (
        <div className="alert alert-error" style={{ marginBottom: 20 }} role="alert">
          {CALLBACK_ERRORS[callbackError]}
        </div>
      )}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 20 }} role="alert">{error}</div>
      )}

      <div className="field" style={{ marginBottom: 16 }}>
        <label htmlFor={`${roleId}-email`}>Email address</label>
        <input
          id={`${roleId}-email`}
          type="email" autoComplete="email" required
          placeholder="your@email.com"
          value={email} onChange={e => setEmail(e.target.value)}
          disabled={loading || !configured}
        />
      </div>

      <div className="field" style={{ marginBottom: 28, position: "relative" }}>
        <label htmlFor={`${roleId}-password`}>Password</label>
        <input
          id={`${roleId}-password`}
          type={showPw ? "text" : "password"} autoComplete="current-password" required
          placeholder="Your password"
          value={password} onChange={e => setPassword(e.target.value)}
          disabled={loading || !configured}
          style={{ paddingRight: 48 }}
        />
        <button
          type="button" onClick={() => setShowPw(v => !v)}
          aria-label={showPw ? "Hide password" : "Show password"}
          style={{ position: "absolute", right: 12, bottom: 11, background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4, fontSize: "1.1rem" }}
        >
          {showPw ? "🙈" : "👁"}
        </button>
      </div>

      <button
        id={`${roleId}-submit`}
        type="submit" className="action"
        disabled={loading || !configured || !email || !password}
        style={{ width: "100%", minHeight: 50, fontSize: "1rem", background: `linear-gradient(135deg,${accent},${accent}cc)` }}
      >
        {loading ? <Spinner /> : "Sign in →"}
      </button>

      {footer && <div style={{ marginTop: 20 }}>{footer}</div>}
    </form>
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
