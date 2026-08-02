"use client";

import { useRef, useEffect, useState, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface DetectedFace {
  student_id: string | null;
  name: string;
  confidence: number;
  is_spoof: boolean;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
}

interface Student {
  id: string;
  name: string;
  photo_urls: string[];
}

interface AttendanceMap {
  [student_id: string]: "present" | "absent";
}

interface Props {
  students: Student[];
  /** User UUID (Personal Mode) or institution UUID (School Mode).
   *  Required for tenant-isolated backend matching. */
  sessionId: string;
  onAttendanceChange: (updated: AttendanceMap) => void;
  onDone: () => void;
}

type InputMode     = "camera" | "video";
type FilterTab     = "all" | "present" | "absent";
type BackendStatus = "checking" | "online" | "offline";
type EnrollStatus  = "idle" | "enrolling" | "done" | "error";

const POLL_INTERVAL_MS  = 3000;   // how often to grab + send a frame (ms)
const VIDEO_POLL_MS     = 1500;   // faster polling when processing a video file
const CAPTURE_W         = 640;
const CAPTURE_H         = 480;

// ── Main Component ─────────────────────────────────────────────────────────

export default function CameraAttendance({
  students,
  sessionId,
  onAttendanceChange,
  onDone,
}: Props) {
  // Start ALL ABSENT — camera fills in present as it detects faces.
  // Teacher only needs to correct misses (much shorter review than marking everyone).
  const initialAttendance: AttendanceMap = Object.fromEntries(
    students.map(s => [s.id, "absent" as const])
  );
  const videoRef    = useRef<HTMLVideoElement>(null);
  const captureRef  = useRef<HTMLCanvasElement>(null);  // hidden, for frame grabs
  const overlayRef  = useRef<HTMLCanvasElement>(null);  // visible overlay for boxes
  const pollTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const videoUrlRef = useRef<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isPolling   = useRef(false);

  const [inputMode,  setInputMode]  = useState<InputMode>("camera");
  const [isActive,   setIsActive]   = useState(false);       // camera/video is playing
  const [isPaused,   setIsPaused]   = useState(false);       // video paused
  const [videoFile,  setVideoFile]  = useState<File | null>(null);
  const [cameraErr,  setCameraErr]  = useState<string | null>(null);
  const [screenshotMode, setScreenshotMode] = useState<"download" | "folder">("download");

  const [backendStatus, setBackendStatus] = useState<BackendStatus>("checking");
  const [enrollStatus,  setEnrollStatus]  = useState<EnrollStatus>("idle");

  const [attendance, setAttendance] = useState<AttendanceMap>(initialAttendance);
  const [lastFaces,  setLastFaces]  = useState<DetectedFace[]>([]);
  const [spoofWarning, setSpoofWarning] = useState(false);
  const [filterTab,  setFilterTab]  = useState<FilterTab>("all");
  const [processingMs, setProcessingMs] = useState<number | null>(null);
  const [framesProcessed, setFramesProcessed] = useState(0);
  const [allPresent, setAllPresent] = useState(false);  // all students detected → stop polling

  // ── Backend health check ──────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/cv/health")
      .then(r => r.ok ? setBackendStatus("online") : setBackendStatus("offline"))
      .catch(()  => setBackendStatus("offline"));
  }, []);

  // ── Enrolment ─────────────────────────────────────────────────────────────

  const enrolStudents = useCallback(async () => {
    setEnrollStatus("enrolling");
    let enrolled: string[] = [];
    try {
      const r = await fetch(`/api/cv/enroll/status?session_id=${encodeURIComponent(sessionId)}`);
      const d = await r.json();
      enrolled = d.enrolled_ids ?? [];
    } catch { /* ignore */ }

    const toEnrol = students.filter(s => !enrolled.includes(s.id) && s.photo_urls.length > 0);
    if (toEnrol.length === 0) { setEnrollStatus("done"); return; }

    try {
      const res = await fetch("/api/cv/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,   // tenant isolation
          students: toEnrol.map(s => ({ student_id: s.id, name: s.name, photo_urls: s.photo_urls })),
        }),
      });
      setEnrollStatus(res.ok ? "done" : "error");
    } catch { setEnrollStatus("error"); }
  }, [students]);

  useEffect(() => {
    if (backendStatus === "online") enrolStudents();
  }, [backendStatus, enrolStudents]);

  // ── Frame capture → backend ───────────────────────────────────────────────

  const captureAndSend = useCallback(async () => {
    if (!videoRef.current || !captureRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2) return;

    const ctx = captureRef.current.getContext("2d");
    if (!ctx) return;
    captureRef.current.width  = CAPTURE_W;
    captureRef.current.height = CAPTURE_H;
    ctx.drawImage(video, 0, 0, CAPTURE_W, CAPTURE_H);

    captureRef.current.toBlob(async blob => {
      if (!blob) return;

      // Snapshot current present set OUTSIDE setState so we can send it
      // in this request (avoids stale closure over attendance)
      const currentPresent = Object.entries(attendance)
        .filter(([, v]) => v === "present")
        .map(([k]) => k);

      const form = new FormData();
      form.append("frame", blob, "frame.jpg");
      form.append("session_id", sessionId);           // tenant isolation key
      form.append("already_present", JSON.stringify(currentPresent));

      const MAX_RETRIES = 3;
      let res: Response | null = null;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          res = await fetch("/api/cv/recognize", { method: "POST", body: form });
          if (res.ok) break;
        } catch {
          if (attempt < MAX_RETRIES - 1) {
            await new Promise(r => setTimeout(r, 500 * (attempt + 1))); // 500ms, 1000ms
          }
        }
      }
      if (!res?.ok) {
        // All retries failed — keep polling, backend temporarily unavailable
        if (isPolling.current) {
          const interval = inputMode === "video" ? VIDEO_POLL_MS : POLL_INTERVAL_MS;
          pollTimer.current = setTimeout(captureAndSend, interval);
        }
        return;
      }

      try {
        const data = await res.json();

        const faces: DetectedFace[] = data.faces ?? [];
        const activeCount: number   = data.active_count ?? 1;

        setLastFaces(faces);
        setProcessingMs(data.processing_ms ?? null);
        setFramesProcessed(n => n + 1);
        drawBoxes(faces);

        let hadSpoof = false;
        setAttendance(prev => {
          const next = { ...prev };
          for (const f of faces) {
            if (f.is_spoof) { hadSpoof = true; continue; }
            if (f.student_id) next[f.student_id] = "present";
          }
          onAttendanceChange(next);
          return next;
        });

        if (hadSpoof) {
          setSpoofWarning(true);
          playBeep(audioCtxRef);
          setTimeout(() => setSpoofWarning(false), 5000);
        }

        // ── Stop polling when all enrolled students are present ──────────
        if (activeCount === 0) {
          isPolling.current = false;
          setAllPresent(true);
          return;   // no next poll scheduled
        }
      } catch { /* JSON parse error — keep polling */ }

      if (isPolling.current) {
        const interval = inputMode === "video" ? VIDEO_POLL_MS : POLL_INTERVAL_MS;
        pollTimer.current = setTimeout(captureAndSend, interval);
      }
    }, "image/jpeg", 0.85);
  // attendance deliberately included so currentPresent snapshot is fresh
  }, [inputMode, onAttendanceChange, attendance]);

  // ── Bounding box overlay ──────────────────────────────────────────────────

  function drawBoxes(faces: DetectedFace[]) {
    const ov  = overlayRef.current;
    const vid = videoRef.current;
    if (!ov || !vid) return;
    const ctx = ov.getContext("2d");
    if (!ctx) return;

    const vw = vid.clientWidth  || CAPTURE_W;
    const vh = vid.clientHeight || CAPTURE_H;
    ov.width  = vw;
    ov.height = vh;
    ctx.clearRect(0, 0, vw, vh);

    const sx = vw / CAPTURE_W;
    const sy = vh / CAPTURE_H;

    for (const face of faces) {
      const [x1, y1, x2, y2] = face.bbox;
      const bx = x1 * sx, by = y1 * sy;
      const bw = (x2 - x1) * sx, bh = (y2 - y1) * sy;

      const colour = face.is_spoof ? "#ef4444" : face.student_id ? "#22c55e" : "#f59e0b";
      ctx.strokeStyle = colour;
      ctx.lineWidth   = 2.5;
      ctx.strokeRect(bx, by, bw, bh);

      // Corner accents
      const cs = 14;
      ctx.lineWidth = 3.5;
      [
        [bx, by, bx + cs, by, bx, by + cs],
        [bx + bw, by, bx + bw - cs, by, bx + bw, by + cs],
        [bx, by + bh, bx + cs, by + bh, bx, by + bh - cs],
        [bx + bw, by + bh, bx + bw - cs, by + bh, bx + bw, by + bh - cs],
      ].forEach(([mx, my, lx1, ly1, lx2, ly2]) => {
        ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(lx1, ly1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(lx2, ly2); ctx.stroke();
      });

      // Label pill
      const label = face.is_spoof
        ? "⚠ PHOTO/SCREEN"
        : face.student_id
          ? `${face.name}  ${Math.round(face.confidence * 100)}%`
          : "Unknown";
      ctx.font = "bold 12px system-ui, sans-serif";
      const tw  = ctx.measureText(label).width + 12;
      const lty = by > 26 ? by - 24 : by + bh + 4;
      ctx.fillStyle = colour;
      roundRect(ctx, bx, lty, tw, 20, 6);
      ctx.fillStyle = "white";
      ctx.fillText(label, bx + 6, lty + 14);
    }
  }

  // ── Camera start / stop ───────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    setCameraErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: CAPTURE_W }, height: { ideal: CAPTURE_H }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.src = "";
        await videoRef.current.play();
      }
      setIsActive(true);
    } catch (e: unknown) {
      setCameraErr(e instanceof Error ? e.message : "Camera access denied");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setIsActive(false);
  }, []);

  // ── Video file start / stop ───────────────────────────────────────────────

  const loadVideoFile = useCallback((file: File) => {
    setVideoFile(file);
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    const url = URL.createObjectURL(file);
    videoUrlRef.current = url;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = url;
      videoRef.current.load();
    }
  }, []);

  const startVideoPlayback = useCallback(async () => {
    if (!videoRef.current || !videoUrlRef.current) return;
    await videoRef.current.play();
    setIsActive(true);
    setIsPaused(false);
  }, []);

  const togglePause = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPaused(false);
    } else {
      videoRef.current.pause();
      setIsPaused(true);
    }
  }, []);

  const stopVideo = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setIsActive(false);
    setIsPaused(false);
  }, []);

  // Handle video file ended
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleEnd = () => { setIsActive(false); setIsPaused(false); };
    video.addEventListener("ended", handleEnd);
    return () => video.removeEventListener("ended", handleEnd);
  }, []);

  // ── Start / stop polling ──────────────────────────────────────────────────

  useEffect(() => {
    if (isActive && enrollStatus === "done") {
      isPolling.current = true;
      pollTimer.current = setTimeout(captureAndSend, 600);
    } else {
      isPolling.current = false;
      if (pollTimer.current) clearTimeout(pollTimer.current);
      // Clear overlay when stopped
      const ov = overlayRef.current;
      if (ov) { const c = ov.getContext("2d"); c?.clearRect(0, 0, ov.width, ov.height); }
    }
    return () => {
      isPolling.current = false;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [isActive, enrollStatus, captureAndSend]);

  // cleanup on unmount
  useEffect(() => () => {
    stopCamera();
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
  }, [stopCamera]);

  // ── Screenshot ────────────────────────────────────────────────────────────

  async function takeScreenshot() {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video) return;

    const tmp = document.createElement("canvas");
    tmp.width  = CAPTURE_W;
    tmp.height = CAPTURE_H;
    const ctx = tmp.getContext("2d")!;
    ctx.drawImage(video, 0, 0, CAPTURE_W, CAPTURE_H);
    if (overlay) ctx.drawImage(overlay, 0, 0, CAPTURE_W, CAPTURE_H);

    const ts       = new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-");
    const filename = `attendance_${ts}.jpg`;

    if (screenshotMode === "folder" && "showSaveFilePicker" in window) {
      try {
        const handle = await (window as Window & { showSaveFilePicker: Function }).showSaveFilePicker({
          suggestedName: filename,
          startIn: "pictures",
          id: "classpulse-screenshots",
          types: [{ description: "JPEG Image", accept: { "image/jpeg": [".jpg"] } }],
        });
        tmp.toBlob(async blob => {
          if (!blob) return;
          const w = await handle.createWritable();
          await w.write(blob);
          await w.close();
        }, "image/jpeg", 0.92);
      } catch { /* cancelled */ }
    } else {
      tmp.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement("a"), { href: url, download: filename });
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, "image/jpeg", 0.92);
    }
  }

  // ── Filtered list ─────────────────────────────────────────────────────────

  const presentIds = new Set(
    Object.entries(attendance).filter(([, v]) => v === "present").map(([k]) => k)
  );

  const filtered = students.filter(s => {
    if (filterTab === "present") return presentIds.has(s.id);
    if (filterTab === "absent")  return !presentIds.has(s.id);
    return true;
  });

  function toggle(id: string) {
    setAttendance(prev => {
      const next = { ...prev, [id]: prev[id] === "present" ? "absent" : "present" } as AttendanceMap;
      onAttendanceChange(next);
      return next;
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // Reset allPresent when session restarts
  useEffect(() => { if (!isActive) setAllPresent(false); }, [isActive]);

  if (backendStatus === "checking") return <BackendCard status="checking" />;
  if (backendStatus === "offline")  return <BackendCard status="offline" onDone={onDone} />;

  const canStart = enrollStatus === "done" || enrollStatus === "error";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* All-present success banner */}
      {allPresent && (
        <div style={{
          background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 14,
          padding: "14px 18px", display: "flex", gap: 12, alignItems: "center",
          animation: "slideIn .3s ease"
        }}>
          <span style={{ fontSize: 28 }}>🎉</span>
          <div>
            <p style={{ fontWeight: 800, color: "#166534", fontSize: ".95rem" }}>
              All students detected! Scanning stopped.
            </p>
            <p style={{ color: "#15803d", fontSize: ".8rem" }}>
              Review the list below, then press Done to save.
            </p>
          </div>
        </div>
      )}

      {/* Spoof warning */}
      {spoofWarning && (
        <div style={{
          background: "#fff1f2", border: "1.5px solid #fca5a5", borderRadius: 14,
          padding: "12px 18px", display: "flex", gap: 12, alignItems: "center",
          animation: "slideIn .3s ease"
        }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>⚠️</span>
          <div>
            <p style={{ fontWeight: 800, color: "#991b1b", fontSize: ".9rem" }}>
              Photo or screen detected!
            </p>
            <p style={{ color: "#b91c1c", fontSize: ".79rem" }}>
              A face in view appears to be a printed photo or screen — it will NOT be marked present.
            </p>
          </div>
        </div>
      )}

      {/* Enrolment status */}
      {enrollStatus === "enrolling" && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 14, padding: "14px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ width: 16, height: 16, border: "2px solid #3b82f6", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />
            <p style={{ fontWeight: 700, fontSize: ".88rem", color: "#1d4ed8" }}>
              Preparing face recognition — downloading student photos…
            </p>
          </div>
          <p style={{ fontSize: ".78rem", color: "#3b82f6" }}>
            You can start the camera now; recognised faces will update automatically.
          </p>
        </div>
      )}
      {enrollStatus === "error" && (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: "12px 18px" }}>
          <p style={{ fontWeight: 700, color: "#c2410c", fontSize: ".85rem" }}>
            ⚠️ Face recognition preparation failed. Manual marking still works.
          </p>
        </div>
      )}

      {/* Input mode selector */}
      <div className="card" style={{ padding: "16px 18px" }}>
        <p style={{ fontSize: ".75rem", fontWeight: 800, color: "#94a3b8", letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 10 }}>
          Input source
        </p>
        <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 12, padding: 4, gap: 0, marginBottom: isActive ? 12 : 0 }}>
          {([["camera", "📷  Live camera"], ["video", "🎬  Video file"]] as [InputMode, string][]).map(([m, label]) => (
            <button key={m} disabled={isActive} onClick={() => { setInputMode(m); setCameraErr(null); }} style={{
              flex: 1, padding: "9px 8px", borderRadius: 9, fontWeight: 700, fontSize: ".85rem",
              cursor: isActive ? "not-allowed" : "pointer", border: "none",
              background: inputMode === m ? "white" : "transparent",
              color: inputMode === m ? "#172033" : "#94a3b8",
              boxShadow: inputMode === m ? "0 1px 5px rgba(0,0,0,.1)" : "none",
              transition: "all .2s"
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* Video file picker */}
        {inputMode === "video" && !isActive && (
          <div style={{ marginTop: 12 }}>
            <label style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
              border: "1.5px dashed #cbd5e1", borderRadius: 12, cursor: "pointer",
              background: videoFile ? "#f0fdf4" : "#fafbfd"
            }}>
              <span style={{ fontSize: 22 }}>{videoFile ? "✅" : "📁"}</span>
              <div>
                <p style={{ fontWeight: 700, fontSize: ".85rem", color: "#334155" }}>
                  {videoFile ? videoFile.name : "Choose a video file"}
                </p>
                <p style={{ fontSize: ".72rem", color: "#94a3b8" }}>
                  MP4, MOV, WebM, AVI — any format your browser supports
                </p>
              </div>
              <input type="file" accept="video/*" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) loadVideoFile(f); }} />
            </label>
          </div>
        )}

        {/* Controls */}
        {inputMode === "camera" && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: isActive ? 0 : 12 }}>
            {!isActive ? (
              <button disabled={!canStart} onClick={startCamera} style={{
                ...btnStyle, background: canStart ? "linear-gradient(135deg,#6d4aff,#8b5cf6)" : "#e2e8f0",
                color: canStart ? "white" : "#94a3b8"
              }}>📷 Start camera</button>
            ) : (
              <button onClick={() => { stopCamera(); }} style={{ ...btnStyle, background: "#fee2e2", color: "#dc2626" }}>
                ⏹ Stop camera
              </button>
            )}
            {isActive && (
              <button onClick={takeScreenshot} style={{ ...btnStyle, background: "white", border: "1px solid #e2e8f0", color: "#334155" }}>
                📸 Screenshot
              </button>
            )}
          </div>
        )}

        {inputMode === "video" && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            {!isActive ? (
              <button disabled={!videoFile || !canStart} onClick={startVideoPlayback} style={{
                ...btnStyle,
                background: videoFile && canStart ? "linear-gradient(135deg,#6d4aff,#8b5cf6)" : "#e2e8f0",
                color: videoFile && canStart ? "white" : "#94a3b8"
              }}>▶ Play &amp; scan</button>
            ) : (
              <>
                <button onClick={togglePause} style={{ ...btnStyle, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" }}>
                  {isPaused ? "▶ Resume" : "⏸ Pause"}
                </button>
                <button onClick={stopVideo} style={{ ...btnStyle, background: "#fee2e2", color: "#dc2626" }}>
                  ⏹ Stop
                </button>
              </>
            )}
            {isActive && (
              <button onClick={takeScreenshot} style={{ ...btnStyle, background: "white", border: "1px solid #e2e8f0", color: "#334155" }}>
                📸 Screenshot
              </button>
            )}
          </div>
        )}

        {/* Screenshot save destination */}
        {isActive && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <span style={{ fontSize: ".76rem", color: "#94a3b8" }}>Screenshot saves to:</span>
            {(["download", "folder"] as const).map(mode => (
              <button key={mode} onClick={() => setScreenshotMode(mode)} style={{
                fontSize: ".73rem", fontWeight: 700, borderRadius: 8,
                border: `1.5px solid ${screenshotMode === mode ? "#6d4aff" : "#e2e8f0"}`,
                padding: "3px 10px", cursor: "pointer",
                background: screenshotMode === mode ? "#f0eeff" : "white",
                color: screenshotMode === mode ? "#6d4aff" : "#64748b"
              }}>
                {mode === "download" ? "⬇ Download" : "📁 Choose folder"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Video / camera view */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Toolbar */}
        <div style={{
          padding: "10px 16px", borderBottom: "1px solid #f1f5f9",
          display: "flex", alignItems: "center", gap: 8
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%", display: "inline-block",
            background: isActive ? (isPaused ? "#f59e0b" : "#22c55e") : "#e2e8f0",
            boxShadow: isActive && !isPaused ? "0 0 0 3px rgba(34,197,94,.2)" : "none"
          }} />
          <span style={{ fontWeight: 700, fontSize: ".85rem", flex: 1 }}>
            {!isActive
              ? inputMode === "camera" ? "Camera — off" : videoFile ? `${videoFile.name}` : "No video loaded"
              : isPaused
                ? "Paused"
                : inputMode === "camera" ? "Camera live" : "Playing & scanning"}
          </span>
          {processingMs !== null && isActive && (
            <span style={{ fontSize: ".72rem", color: "#94a3b8", marginLeft: "auto" }}>
              {framesProcessed} frames · last {processingMs}ms
            </span>
          )}
        </div>

        {/* Live status bar — shows face detection counts when active */}
        {isActive && lastFaces.length > 0 && (() => {
          const matched  = lastFaces.filter(f => !f.is_spoof && f.student_id).length;
          const unknown  = lastFaces.filter(f => !f.is_spoof && !f.student_id).length;
          const spoofed  = lastFaces.filter(f => f.is_spoof).length;
          return (
            <div style={{
              padding: "7px 16px", background: "#1e293b", display: "flex",
              alignItems: "center", gap: 6, fontSize: ".78rem", fontWeight: 700, color: "white",
              flexWrap: "wrap"
            }}>
              <span style={{ color: "#94a3b8" }}>📡</span>
              <span>{lastFaces.length} face{lastFaces.length !== 1 ? "s" : ""} detected</span>
              {matched > 0  && <><span style={{ color: "#94a3b8" }}>·</span><span style={{ color: "#4ade80" }}>✓ {matched} matched</span></>}
              {unknown > 0  && <><span style={{ color: "#94a3b8" }}>·</span><span style={{ color: "#fbbf24" }}>? {unknown} unknown</span></>}
              {spoofed > 0  && <><span style={{ color: "#94a3b8" }}>·</span><span style={{ color: "#f87171" }}>⚠ {spoofed} blocked</span></>}
            </div>
          );
        })()}

        {/* Player */}
        <div style={{ position: "relative", background: "#080814", minHeight: 240 }}>
          {/* Camera error */}
          {cameraErr && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, zIndex: 2 }}>
              <span style={{ fontSize: 28 }}>🚫</span>
              <p style={{ color: "#fca5a5", fontSize: ".83rem", textAlign: "center", maxWidth: 280 }}>{cameraErr}</p>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay={false}
            playsInline
            muted
            controls={inputMode === "video"}
            style={{
              width: "100%",
              maxHeight: 380,
              objectFit: "contain",
              display: "block"
            }}
          />
          {/* Bounding box overlay */}
          <canvas
            ref={overlayRef}
            style={{
              position: "absolute", top: 0, left: 0,
              width: "100%", height: "100%",
              pointerEvents: "none"
            }}
          />
          {/* Hidden capture canvas */}
          <canvas ref={captureRef} style={{ display: "none" }} />

          {/* Idle overlay */}
          {!isActive && !cameraErr && (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10
            }}>
              <span style={{ fontSize: 44, opacity: 0.4 }}>{inputMode === "camera" ? "📷" : "🎬"}</span>
              <p style={{ color: "#64748b", fontSize: ".85rem" }}>
                {inputMode === "camera"
                  ? "Press 'Start camera' to begin scanning"
                  : videoFile
                    ? "Press 'Play & scan' to start"
                    : "Choose a video file above"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Attendance list */}
      <div className="card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: "1rem", marginBottom: 2 }}>
              Attendance — {students.length} students
            </h2>
            <p style={{ color: "#64748b", fontSize: ".8rem" }}>
              {presentIds.size} present · {students.length - presentIds.size} absent
              {isActive && !isPaused && <span style={{ marginLeft: 8, color: "#22c55e", fontWeight: 700, fontSize: ".75rem" }}>● scanning</span>}
            </p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => { const a = Object.fromEntries(students.map(s => [s.id, "present" as const])); setAttendance(a); onAttendanceChange(a); }}
              style={{ fontSize: ".72rem", fontWeight: 700, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>All present</button>
            <button onClick={() => { const a = Object.fromEntries(students.map(s => [s.id, "absent" as const])); setAttendance(a); onAttendanceChange(a); }}
              style={{ fontSize: ".72rem", fontWeight: 700, background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>All absent</button>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 10, padding: 3, marginBottom: 14 }}>
          {(["all", "present", "absent"] as FilterTab[]).map(tab => (
            <button key={tab} onClick={() => setFilterTab(tab)} style={{
              flex: 1, padding: "7px 4px", borderRadius: 8, fontWeight: 700, fontSize: ".8rem",
              cursor: "pointer", border: "none",
              background: filterTab === tab ? "white" : "transparent",
              color: filterTab === tab
                ? (tab === "present" ? "#166534" : tab === "absent" ? "#991b1b" : "#172033")
                : "#94a3b8",
              boxShadow: filterTab === tab ? "0 1px 4px rgba(0,0,0,.08)" : "none"
            }}>
              {tab === "all"     && `All (${students.length})`}
              {tab === "present" && `✓ Present (${presentIds.size})`}
              {tab === "absent"  && `✗ Absent (${students.length - presentIds.size})`}
            </button>
          ))}
        </div>

        {/* Student rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 420, overflowY: "auto" }}>
          {filtered.map(s => {
            const present  = presentIds.has(s.id);
            const detected = lastFaces.find(f => f.student_id === s.id);
            return (
              <div key={s.id} onClick={() => toggle(s.id)} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
                borderRadius: 13, cursor: "pointer",
                border: `1.5px solid ${present ? "#86efac" : "#e2e8f0"}`,
                background: present ? "#f0fdf4" : "#fafbfd",
                transition: "all .15s"
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: present ? "linear-gradient(135deg,#22c55e,#16a34a)" : "linear-gradient(135deg,#e2e8f0,#cbd5e1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: present ? "white" : "#94a3b8", fontWeight: 800, fontSize: ".8rem",
                  border: detected ? "2.5px solid #6d4aff" : "2px solid transparent",
                  boxShadow: detected ? "0 0 0 3px rgba(109,74,255,.15)" : "none"
                }}>
                  {s.name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: ".9rem" }}>{s.name}</p>
                  {detected && (
                    <p style={{ fontSize: ".72rem", color: "#6d4aff", marginTop: 1 }}>
                      Just detected · {Math.round(detected.confidence * 100)}% match
                    </p>
                  )}
                </div>
                <span style={{
                  fontWeight: 800, fontSize: ".78rem", padding: "3px 12px", borderRadius: 20,
                  background: present ? "#dcfce7" : "#f1f5f9",
                  color: present ? "#166534" : "#64748b"
                }}>
                  {present ? "Present" : "Absent"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <button className="action" onClick={() => { stopCamera(); stopVideo(); onDone(); }}
        style={{ width: "100%", minHeight: 50, background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
        ✓ Done — review &amp; save →
      </button>

      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath(); ctx.fill();
}

function playBeep(audioCtxRef: React.MutableRefObject<AudioContext | null>) {
  try {
    const ctx = audioCtxRef.current ?? new AudioContext();
    audioCtxRef.current = ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  } catch { /* ignore */ }
}

const btnStyle: React.CSSProperties = {
  fontSize: ".82rem", fontWeight: 700, borderRadius: 10,
  border: "none", padding: "8px 15px", cursor: "pointer"
};

// ── Backend offline card ──────────────────────────────────────────────────────

function BackendCard({ status, onDone }: { status: "checking" | "offline"; onDone?: () => void }) {
  if (status === "checking") {
    return (
      <div className="card" style={{ padding: "40px 24px", textAlign: "center" }}>
        <span style={{ display: "inline-block", width: 36, height: 36, border: "3px solid #6d4aff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .7s linear infinite", marginBottom: 16 }} />
        <p style={{ fontWeight: 700, color: "#334155", marginTop: 4 }}>Starting face recognition…</p>
        <p style={{ color: "#94a3b8", fontSize: ".82rem", marginTop: 6 }}>This takes a few seconds on first load.</p>
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: "36px 24px", textAlign: "center", border: "1.5px solid #e7edf5", background: "#fafbfd" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
      <h2 style={{ fontWeight: 800, marginBottom: 8, fontSize: "1.1rem" }}>Camera AI is warming up</h2>
      <p style={{ color: "#64748b", fontSize: ".88rem", lineHeight: 1.6, marginBottom: 20, maxWidth: 340, margin: "0 auto 20px" }}>
        The face recognition engine may take up to 30 seconds to start.
        You can wait and retry, or use manual roll call instead.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={() => window.location.reload()} className="action" style={{ minHeight: 44 }}>
          🔄 Retry
        </button>
        {onDone && (
          <button onClick={onDone} className="action action-secondary" style={{ minHeight: 44 }}>
            ✏️ Manual roll call instead
          </button>
        )}
      </div>
    </div>
  );
}

