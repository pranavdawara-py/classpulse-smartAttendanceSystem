"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Auth helper ────────────────────────────────────────────────────────────────

async function getPersonalUser() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { user, supabase } : null;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type StudentActionState = { error?: string; success?: boolean; studentId?: string } | null;
export type PhotoActionState   = { error?: string; success?: boolean; photoId?: string; signedUrl?: string } | null;
export type BulkCreateResult   = { created: number; errors: string[] };

// ── Bulk create students (new "add many at once" flow) ────────────────────────
//
// FormData shape:
//   count                        → number of students
//   student_{i}_name             → student name
//   student_{i}_roll             → roll number (optional)
//   student_{i}_photo_{j}        → File (up to 3 per student)
//
// Called directly from client (not via useActionState) so no _prev param.

export async function bulkCreateStudents(formData: FormData): Promise<BulkCreateResult> {
  const ctx = await getPersonalUser();
  if (!ctx) return { created: 0, errors: ["Not signed in."] };

  const admin = createAdminClient();
  const count = parseInt((formData.get("count") as string) ?? "0", 10);
  if (!count || isNaN(count)) return { created: 0, errors: ["No students to add."] };

  const errors: string[] = [];
  let created = 0;

  for (let i = 0; i < count; i++) {
    const name = ((formData.get(`student_${i}_name`) as string) ?? "").trim();
    if (!name) continue;

    const roll = ((formData.get(`student_${i}_roll`) as string) ?? "").trim() || null;

    // 1 — create the student record
    const { data: student, error: studentErr } = await ctx.supabase
      .from("standalone_students")
      .insert({ user_id: ctx.user.id, name, roll_number: roll })
      .select("id")
      .single();

    if (studentErr) {
      errors.push(`"${name}": ${studentErr.message}`);
      continue;
    }

    // 2 — upload photos (up to 3)
    for (let j = 0; j < 3; j++) {
      const file = formData.get(`student_${i}_photo_${j}`) as File | null;
      if (!file || !file.size) break;

      if (file.size > 5 * 1024 * 1024) {
        errors.push(`"${name}" photo ${j + 1}: exceeds 5 MB — skipped.`);
        continue;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        errors.push(`"${name}" photo ${j + 1}: unsupported type — skipped.`);
        continue;
      }

      if (!admin) { errors.push("Storage not configured."); break; }

      const ext    = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const photoId = crypto.randomUUID();
      const path   = `personal/${ctx.user.id}/${student.id}/${photoId}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadErr } = await admin.storage
        .from("standalone-photos")
        .upload(path, buffer, { contentType: file.type, upsert: false });

      if (uploadErr) {
        errors.push(`"${name}" photo ${j + 1}: ${uploadErr.message}`);
        continue;
      }

      await ctx.supabase.from("standalone_student_photos").insert({
        student_id:   student.id,
        user_id:      ctx.user.id,
        object_path:  path,
        content_type: file.type,
        bytes:        file.size,
      });
    }

    created++;
  }

  revalidatePath("/attend");
  return { created, errors };
}

// ── Single student management (kept for future edit UI) ───────────────────────

export async function createStandaloneStudent(
  _prev: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const ctx = await getPersonalUser();
  if (!ctx) return { error: "Sign in to manage your student roster." };

  const name       = (formData.get("name")        as string).trim();
  const rollNumber = (formData.get("roll_number")  as string | null)?.trim() || null;

  if (!name || name.length < 1) return { error: "Please enter the student's name." };

  const { data, error } = await ctx.supabase
    .from("standalone_students")
    .insert({ user_id: ctx.user.id, name, roll_number: rollNumber })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/attend");
  return { success: true, studentId: data.id };
}

export async function deleteStandaloneStudent(studentId: string): Promise<{ error?: string; success?: boolean }> {
  const ctx = await getPersonalUser();
  if (!ctx) return { error: "Not signed in." };

  const { error } = await ctx.supabase
    .from("standalone_students")
    .delete()
    .eq("id", studentId)
    .eq("user_id", ctx.user.id);

  if (error) return { error: error.message };

  revalidatePath("/attend");
  return { success: true };
}

export async function listStandaloneStudents(userId: string) {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("standalone_students")
    .select("id, name, roll_number, active, created_at, standalone_student_photos(id, object_path)")
    .eq("user_id", userId)
    .eq("active", true)
    .order("created_at");

  return (data ?? []) as unknown as {
    id: string;
    name: string;
    roll_number: string | null;
    active: boolean;
    created_at: string;
    standalone_student_photos: { id: string; object_path: string }[];
  }[];
}

// ── Photo management ───────────────────────────────────────────────────────────

export async function uploadStandaloneStudentPhoto(
  _prev: PhotoActionState,
  formData: FormData
): Promise<PhotoActionState> {
  const ctx = await getPersonalUser();
  if (!ctx) return { error: "Sign in to upload photos." };

  const studentId = formData.get("student_id") as string;
  const file      = formData.get("photo") as File | null;

  if (!studentId) return { error: "Student ID is required." };
  if (!file || !(file instanceof File) || file.size === 0) return { error: "Please select a photo." };
  if (file.size > 5 * 1024 * 1024) return { error: "Photo must be under 5 MB." };
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { error: "Only JPEG, PNG, or WebP images are accepted." };
  }

  const { data: student } = await ctx.supabase
    .from("standalone_students")
    .select("id")
    .eq("id", studentId)
    .eq("user_id", ctx.user.id)
    .single();

  if (!student) return { error: "Student not found." };

  const { count } = await ctx.supabase
    .from("standalone_student_photos")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId);

  if ((count ?? 0) >= 3) return { error: "Maximum 3 photos per student." };

  const admin = createAdminClient();
  if (!admin) return { error: "Server not configured." };

  const ext     = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const photoId = crypto.randomUUID();
  const path    = `personal/${ctx.user.id}/${studentId}/${photoId}.${ext}`;
  const buffer  = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await admin.storage
    .from("standalone-photos")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadErr) return { error: `Upload failed: ${uploadErr.message}` };

  const { data: photoRow, error: dbErr } = await ctx.supabase
    .from("standalone_student_photos")
    .insert({ student_id: studentId, user_id: ctx.user.id, object_path: path, content_type: file.type, bytes: file.size })
    .select("id")
    .single();

  if (dbErr) {
    await admin.storage.from("standalone-photos").remove([path]);
    return { error: dbErr.message };
  }

  const { data: signed } = await admin.storage
    .from("standalone-photos")
    .createSignedUrl(path, 3600);

  revalidatePath("/attend");
  return { success: true, photoId: photoRow.id, signedUrl: signed?.signedUrl };
}

export async function deleteStandaloneStudentPhoto(photoId: string): Promise<{ error?: string; success?: boolean }> {
  const ctx = await getPersonalUser();
  if (!ctx) return { error: "Not signed in." };

  const { data: photo } = await ctx.supabase
    .from("standalone_student_photos")
    .select("object_path")
    .eq("id", photoId)
    .eq("user_id", ctx.user.id)
    .single();

  if (!photo) return { error: "Photo not found." };

  const admin = createAdminClient();
  if (admin) await admin.storage.from("standalone-photos").remove([photo.object_path]);

  await ctx.supabase
    .from("standalone_student_photos")
    .delete()
    .eq("id", photoId)
    .eq("user_id", ctx.user.id);

  revalidatePath("/attend");
  return { success: true };
}

export async function getSignedPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const admin = createAdminClient();
  if (!admin) return {};

  const { data } = await admin.storage
    .from("standalone-photos")
    .createSignedUrls(paths, 3600);

  return Object.fromEntries(
    (data ?? []).map(item => [item.path, item.signedUrl])
  );
}
