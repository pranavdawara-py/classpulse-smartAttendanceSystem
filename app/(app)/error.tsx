"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Only log in dev — never expose to users
    if (process.env.NODE_ENV === "development") {
      console.error("App boundary caught error:", error);
    }
  }, [error]);

  return (
    <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div className="card" style={{ maxWidth: 440, padding: "40px 32px", textAlign: "center" }}>
        <span style={{ fontSize: 48 }}>⚠️</span>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginTop: 16, marginBottom: 8 }}>
          Something went wrong
        </h2>
        <p style={{ color: "#64748b", fontSize: "0.93rem", lineHeight: 1.6, marginBottom: 24 }}>
          An unexpected error occurred. Please try again or go back to the home screen.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={() => window.location.href = "/"} className="action action-secondary">
            Go home
          </button>
          <button onClick={() => reset()} className="action">
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
