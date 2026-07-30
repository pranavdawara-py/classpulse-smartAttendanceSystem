"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type StandaloneAttendanceEntry = {
  studentId: string;
  name: string;
  rollNumber: string | null;
  status: "present" | "absent";
};

export type StandaloneSaveState = {
  error?: string;
  success?: boolean;
  sessionId?: string;
} | null;

/**
 * Saves a Personal Mode attendance session.
 *
 * Creates:
 *   1. standalone_sessions row (owned by user)
 *   2. standalone_attendance_entries rows (one per student)
 *
 * Uses the regular user client — RLS policies enforce ownership.
 * Service role is NOT needed here (no institution scoping).
 */
export async function saveStandaloneSession(
  _prev: StandaloneSaveState,
  formData: FormData
): Promise<StandaloneSaveState> {
  const supabase = await createClient();
  if (!supabase) return { error: "Server not configured." };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first to save your session." };

  const label      = (formData.get("label") as string | null)?.trim() || null;
  const entriesRaw = formData.get("entries") as string;

  let entries: StandaloneAttendanceEntry[];
  try {
    entries = JSON.parse(entriesRaw);
  } catch {
    return { error: "Invalid session data." };
  }
  if (!entries.length) return { error: "No students in this session." };

  // 1 — Create the session record.
  const { data: session, error: sessionErr } = await supabase
    .from("standalone_sessions")
    .insert({ user_id: user.id, label, input_mode: "manual" })
    .select("id")
    .single();

  if (sessionErr) return { error: sessionErr.message };

  // 2 — Create per-student attendance entries.
  const entryRows = entries.map(e => ({
    session_id:   session.id,
    student_id:   e.studentId,
    student_name: e.name,
    roll_number:  e.rollNumber ?? null,
    status:       e.status,
  }));

  const { error: entriesErr } = await supabase
    .from("standalone_attendance_entries")
    .insert(entryRows);

  if (entriesErr) {
    // Rollback session on entry failure.
    await supabase.from("standalone_sessions").delete().eq("id", session.id);
    return { error: entriesErr.message };
  }

  revalidatePath("/attend");
  return { success: true, sessionId: session.id };
}

// ────────────────────────────────────────────────────────────────────────────
// listStandaloneSessions — session history for Personal Mode dashboard
// ────────────────────────────────────────────────────────────────────────────

export interface StandaloneSessionSummary {
  id: string;
  label: string | null;
  subject: string | null;
  input_mode: string;
  created_at: string;
  entries: {
    id: string;
    student_name: string;
    roll_number: string | null;
    status: "present" | "absent";
    detection_source: string;
    confidence: number | null;
  }[];
}

export async function listStandaloneSessions(): Promise<StandaloneSessionSummary[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("standalone_sessions")
    .select(`
      id, label, subject, input_mode, created_at,
      standalone_attendance_entries (
        id, student_name, roll_number, status, detection_source, confidence
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("listStandaloneSessions error:", error.message);
    return [];
  }

  // Supabase returns the related table as `standalone_attendance_entries`;
  // rename to `entries` to match the exported type.
  return (data ?? []).map((s: any) => ({
    id: s.id,
    label: s.label,
    subject: s.subject,
    input_mode: s.input_mode,
    created_at: s.created_at,
    entries: (s.standalone_attendance_entries ?? []).map((e: any) => ({
      id: e.id,
      student_name: e.student_name,
      roll_number: e.roll_number,
      status: e.status,
      detection_source: e.detection_source ?? "manual",
      confidence: e.confidence ?? null,
    })),
  })) as StandaloneSessionSummary[];
}
