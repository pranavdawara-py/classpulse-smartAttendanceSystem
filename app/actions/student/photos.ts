"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Auth helper ───────────────────────────────────────────────────────────────

async function getStudentContext() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, institution_id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "student" || !profile.institution_id) return null;

  return { user, supabase, institutionId: profile.institution_id };
}

// ── uploadStudentSelfPhoto ─────────────────────────────────────────────────────
// Students can upload their own face photos via the /student page.
// Photos are stored in face_enrolments with uploaded_by_role = 'student'.
// Max 3 photos per student total.

export type SelfPhotoState = { error?: string; success?: boolean; photoId?: string } | null;

export async function uploadStudentSelfPhoto(
  _prev: SelfPhotoState,
  formData: FormData
): Promise<SelfPhotoState> {
  const ctx = await getStudentContext();
  if (!ctx) return { error: "Sign in as a student to upload photos." };

  const file = formData.get("photo") as File | null;
  if (!file || !(file instanceof File) || file.size === 0) return { error: "Please select a photo." };
  if (file.size > 5 * 1024 * 1024) return { error: "Photo must be under 5 MB." };
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { error: "Only JPEG, PNG, or WebP images are accepted." };
  }

  const admin = createAdminClient();
  if (!admin) return { error: "Server not configured." };

  // Count existing photos (school + student uploaded)
  const { count } = await ctx.supabase
    .from("face_enrolments")
    .select("id", { count: "exact", head: true })
    .eq("student_id", ctx.user.id)
    .eq("institution_id", ctx.institutionId);

  if ((count ?? 0) >= 3) {
    return { error: "Maximum 3 face photos allowed. Please delete one first if you want to add a new one." };
  }

  const ext     = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const photoId = crypto.randomUUID();
  const path    = `school/${ctx.institutionId}/${ctx.user.id}/${photoId}.${ext}`;
  const buffer  = Buffer.from(await file.arrayBuffer());

  // Upload to storage (use standalone-photos bucket or create face-photos bucket)
  // For now, use standalone-photos since it's the only bucket we have
  const { error: uploadErr } = await admin.storage
    .from("standalone-photos")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadErr) return { error: `Upload failed: ${uploadErr.message}` };

  // Insert face_enrolments row — uploaded_by_role may not exist yet (Migration 008 pending)
  // Use a try-catch to handle the case where the column doesn't exist yet
  const insertData: Record<string, unknown> = {
    student_id:      ctx.user.id,
    institution_id:  ctx.institutionId,
    image_path:      path,
    school_locked:   false,   // Student's own photo — not school-locked
  };

  // Only include uploaded_by_role if migration 008 has been applied
  try {
    const { data: photoRow, error: dbErr } = await admin
      .from("face_enrolments")
      .insert({ ...insertData, uploaded_by_role: "student" })
      .select("id")
      .single();

    if (dbErr) {
      // If column doesn't exist yet, try without it
      if (dbErr.message.includes("uploaded_by_role")) {
        const { data: fallback, error: fErr } = await admin
          .from("face_enrolments")
          .insert(insertData)
          .select("id")
          .single();
        if (fErr) {
          await admin.storage.from("standalone-photos").remove([path]);
          return { error: fErr.message };
        }
        revalidatePath("/student");
        return { success: true, photoId: fallback?.id };
      }
      await admin.storage.from("standalone-photos").remove([path]);
      return { error: dbErr.message };
    }

    revalidatePath("/student");
    return { success: true, photoId: photoRow?.id };
  } catch {
    return { error: "Unexpected error during photo upload." };
  }
}

// ── deleteStudentSelfPhoto ────────────────────────────────────────────────────
// Students can delete their own photos UNLESS school_locked = true.

export async function deleteStudentSelfPhoto(photoId: string): Promise<{ error?: string; success?: boolean }> {
  const ctx = await getStudentContext();
  if (!ctx) return { error: "Not signed in." };

  // Fetch the photo and check ownership + lock
  const { data: photo } = await ctx.supabase
    .from("face_enrolments")
    .select("id, image_path, school_locked, student_id")
    .eq("id", photoId)
    .single();

  if (!photo || photo.student_id !== ctx.user.id) return { error: "Photo not found." };

  // Check school_locked (column may not exist yet if migration 008 not pushed)
  if (photo.school_locked === true) {
    return { error: "This photo was uploaded by your school and cannot be deleted." };
  }

  const admin = createAdminClient();
  if (admin && photo.image_path) {
    await admin.storage.from("standalone-photos").remove([photo.image_path]);
  }

  await ctx.supabase.from("face_enrolments").delete().eq("id", photoId);

  revalidatePath("/student");
  return { success: true };
}

// ── listStudentPhotos ─────────────────────────────────────────────────────────

export async function listStudentPhotos(studentId: string, institutionId: string) {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from("face_enrolments")
    .select("id, image_path, school_locked, uploaded_by_role, created_at")
    .eq("student_id", studentId)
    .eq("institution_id", institutionId)
    .order("created_at");

  return (data ?? []) as {
    id: string;
    image_path: string;
    school_locked: boolean;
    uploaded_by_role: "school" | "student" | null;
    created_at: string;
  }[];
}

// ── getStudentPhotoSignedUrls ─────────────────────────────────────────────────

export async function getStudentPhotoSignedUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const admin = createAdminClient();
  if (!admin) return {};

  const { data } = await admin.storage
    .from("standalone-photos")
    .createSignedUrls(paths, 3600);

  return Object.fromEntries((data ?? []).map(item => [item.path, item.signedUrl ?? ""]));
}
