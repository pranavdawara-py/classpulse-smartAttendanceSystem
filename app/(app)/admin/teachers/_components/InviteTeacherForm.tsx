"use client";

import { useActionState, useRef, useEffect } from "react";
import { inviteTeacher, type TeacherActionState } from "@/app/actions/admin/teachers";

export default function InviteTeacherForm() {
  const [state, formAction, pending] = useActionState<TeacherActionState, FormData>(inviteTeacher, null);
  const formRef = useRef<HTMLFormElement>(null);

  // Reset form on success
  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state?.success]);

  return (
    <div className="card" style={{ padding: "24px 22px", position: "sticky", top: 24 }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: 4 }}>Invite a teacher</h2>
      <p style={{ color: "#64748b", fontSize: ".83rem", marginBottom: 20 }}>
        They will receive an email with a link to set their password.
      </p>

      {state?.error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>{state.error}</div>
      )}
      {state?.success && (
        <div className="alert" style={{ marginBottom: 16, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: 12, padding: "12px 16px" }}>
          ✓ Invite sent! The teacher will receive an email shortly.
        </div>
      )}

      <form ref={formRef} action={formAction} noValidate>
        <div className="field" style={{ marginBottom: 14 }}>
          <label htmlFor="invite-name">Full name <span style={{ color: "#ff4f88" }}>*</span></label>
          <input id="invite-name" name="full_name" type="text" required
            placeholder="e.g. Priya Sharma" disabled={pending} />
        </div>
        <div className="field" style={{ marginBottom: 22 }}>
          <label htmlFor="invite-email">Email address <span style={{ color: "#ff4f88" }}>*</span></label>
          <input id="invite-email" name="email" type="email" required
            placeholder="teacher@school.edu" disabled={pending} />
        </div>
        <button id="invite-teacher-btn" type="submit" className="action"
          disabled={pending} style={{ width: "100%", minHeight: 46 }}>
          {pending
            ? <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />
                Sending invite…
              </span>
            : "📧 Send invite"}
        </button>
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
