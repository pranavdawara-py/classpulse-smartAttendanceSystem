export default function AppLoading() {
  return (
    <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{
          width: 36, height: 36,
          border: "3px solid rgba(109, 74, 255, 0.2)",
          borderTopColor: "#6d4aff",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite"
        }} />
        <p style={{ color: "#64748b", fontWeight: 600, fontSize: "0.9rem" }}>Loading…</p>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
