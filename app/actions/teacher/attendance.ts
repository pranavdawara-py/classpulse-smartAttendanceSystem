"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getCallerTeacherContext() {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, institution_id")
    .eq("id", user.id)
    .single();

  // Both teachers and admins may mark attendance.
  if (!["teacher", "admin"].includes(profile?.role ?? "") || !profile?.institution_id) return null;

  return {
    userId: user.id,
    institutionId: profile.institution_id as string,
    role: profile.role as "teacher" | "admin"
  };
}

// ── Fetch batches + students for the attendance form ─────────────────────────

export async function getAttendanceFormData(institutionId: string) {
  const supabase = await createClient();
  if (!supabase) return { batches: [], students: [] };

  const [batchRes, studentRes] = await Promise.all([
    supabase
      .from("batches")
      .select("id, name")
      .eq("institution_id", institutionId)
      .eq("active", true)
      .order("name"),
    supabase
      .from("student_profiles")
      .select("profile_id, full_name, roll_number, batch_memberships(batch_id)")
      .eq("institution_id", institutionId)
      .eq("active", true)
      .order("full_name")
  ]);

  return {
    batches:  (batchRes.data  ?? []) as { id: string; name: string }[],
    students: (studentRes.data ?? []) as {
      profile_id: string;
      full_name: string;
      roll_number: string | null;
      batch_memberships: { batch_id: string }[];
    }[]
  };
}

// ── Save attendance session ───────────────────────────────────────────────────

export type AttendanceRecord = {
  studentId: string;
  status: "present" | "absent";
};

export type SaveAttendanceState = { error?: string; success?: boolean; sessionId?: string } | null;

export async function saveAttendanceSession(
  _prev: SaveAttendanceState,
  formData: FormData
): Promise<SaveAttendanceState> {
  const ctx = await getCallerTeacherContext();
  if (!ctx) return { error: "Not authorised." };

  const label     = (formData.get("label") as string | null)?.trim() || null;
  const batchId   = (formData.get("batch_id") as string | null) || null;
  const inputMode = (formData.get("input_mode") as string) || "live_camera";
  const entriesRaw = formData.get("entries") as string;

  let entries: AttendanceRecord[] = [];
  try {
    entries = JSON.parse(entriesRaw);
  } catch {
    return { error: "Invalid attendance data." };
  }

  if (entries.length === 0) return { error: "No students selected for this session." };

  const admin = createAdminClient();
  if (!admin) return { error: "Server not configured." };

  const now = new Date().toISOString();

  // 1 — Create lecture (ad-hoc: batch_id + course_id are nullable after migration 003).
  const { data: lecture, error: lErr } = await admin
    .from("lectures")
    .insert({
      institution_id:      ctx.institutionId,
      teacher_id:          ctx.userId,
      batch_id:            batchId,           // null for ad-hoc
      course_id:           null,
      label:               label,
      scheduled_starts_at: now,
      scheduled_ends_at:   new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      status:              "completed",
      created_by:          ctx.userId,
      updated_by:          ctx.userId
    })
    .select("id")
    .single();

  if (lErr) return { error: `Could not create session: ${lErr.message}` };
  const lectureId = lecture.id;

  // 2 — Create lecture_students rows.
  const lectureStudents = entries.map(e => ({
    institution_id: ctx.institutionId,
    lecture_id:     lectureId,
    student_id:     e.studentId,
    added_by:       ctx.userId
  }));

  const { data: lsData, error: lsErr } = await admin
    .from("lecture_students")
    .insert(lectureStudents)
    .select("id, student_id");

  if (lsErr) return { error: `Could not save student list: ${lsErr.message}` };

  // Build studentId → lecture_student.id map.
  const lsMap = Object.fromEntries((lsData ?? []).map(ls => [ls.student_id, ls.id]));

  // 3 — Create attendance_session.
  const { data: session, error: sErr } = await admin
    .from("attendance_sessions")
    .insert({
      institution_id: ctx.institutionId,
      lecture_id:     lectureId,
      started_by:     ctx.userId,
      input_mode:     inputMode,
      status:         "confirmed",
      confirmed_at:   now,
      confirmed_by:   ctx.userId
    })
    .select("id")
    .single();

  if (sErr) return { error: `Could not create session record: ${sErr.message}` };
  const sessionId = session.id;

  // 4 — Create attendance_entries (one per student).
  const attendanceEntries = entries.map(e => ({
    institution_id:     ctx.institutionId,
    session_id:         sessionId,
    lecture_student_id: lsMap[e.studentId],
    status:             e.status,
    manually_changed:   true,           // all entries in this flow are manual for now
    changed_by:         ctx.userId,
    changed_at:         now
  }));

  const { error: aeErr } = await admin
    .from("attendance_entries")
    .insert(attendanceEntries);

  if (aeErr) return { error: `Could not save attendance: ${aeErr.message}` };

  revalidatePath("/teacher");
  return { success: true, sessionId };
}

// ── Today's sessions (teacher dashboard) ─────────────────────────────────────

export type TodaySession = {
  id: string;
  label: string | null;
  batch_name: string | null;
  started_at: string;
  present_count: number;
  total_count: number;
};

export async function getTodaySessions(): Promise<TodaySession[]> {
  const ctx = await getCallerTeacherContext();
  if (!ctx) return [];

  const supabase = await createClient();
  if (!supabase) return [];

  // IST = UTC+5:30. Midnight IST = 18:30 UTC previous day.
  const now      = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow   = new Date(now.getTime() + istOffset);
  const istMidnight = new Date(istNow);
  istMidnight.setUTCHours(0, 0, 0, 0);
  const utcMidnight = new Date(istMidnight.getTime() - istOffset);

  const { data: sessions } = await supabase
    .from("attendance_sessions")
    .select(`
      id, started_at, confirmed_at,
      lectures!inner(
        id, label, batch_id,
        batches(name),
        lecture_students(count)
      ),
      attendance_entries(status)
    `)
    .eq("institution_id", ctx.institutionId)
    .eq("started_by", ctx.userId)
    .gte("started_at", utcMidnight.toISOString())
    .order("started_at", { ascending: false })
    .limit(5);

  if (!sessions) return [];

  return sessions.map((s: Record<string, unknown>) => {
    const lecture = s.lectures as Record<string, unknown> | null;
    const entries = (s.attendance_entries as { status: string }[]) ?? [];
    const lectureStudents = (lecture?.lecture_students as { count: number }[]) ?? [];
    const totalCount = lectureStudents.reduce((sum, ls) => sum + (ls.count ?? 0), 0);
    const batches = lecture?.batches as { name: string } | null;
    return {
      id:            s.id as string,
      label:         (lecture?.label as string | null) ?? null,
      batch_name:    batches?.name ?? null,
      started_at:    (s.started_at ?? s.confirmed_at) as string,
      present_count: entries.filter(e => e.status === "present").length,
      total_count:   totalCount,
    };
  });
}
