"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ParsedStudent } from "@/lib/zip-parser";

// ── Shared helper ─────────────────────────────────────────────────────────────

async function getCallerAdminContext() {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, institution_id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" || !profile.institution_id) return null;
  return { callerId: user.id, institutionId: profile.institution_id as string };
}

/** Get or generate institution slug (for fake-email student login). */
async function getInstitutionSlug(admin: ReturnType<typeof createAdminClient>, institutionId: string): Promise<string> {
  const { data } = await admin!.from("institutions").select("slug, name").eq("id", institutionId).single();
  if (data?.slug) return data.slug;
  // Fallback: derive slug from name if not set yet
  return (data?.name ?? institutionId)
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Build the fake email used internally for student ID login. */
function buildStudentFakeEmail(loginId: string, institutionSlug: string): string {
  return `${loginId}@${institutionSlug}.students.classpulse.app`;
}

// ── Batch actions ─────────────────────────────────────────────────────────────

export type BatchActionState = { error?: string; success?: boolean; batchId?: string } | null;

export async function createBatch(
  _prev: BatchActionState,
  formData: FormData
): Promise<BatchActionState> {
  const ctx = await getCallerAdminContext();
  if (!ctx) return { error: "Not authorised." };

  const name = (formData.get("name") as string).trim();
  if (!name || name.length < 1) return { error: "Please enter a batch name." };

  const admin = createAdminClient();
  if (!admin) return { error: "Server not configured." };

  const { data, error } = await admin
    .from("batches")
    .insert({ institution_id: ctx.institutionId, name })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("unique")) return { error: `A batch named "${name}" already exists.` };
    return { error: error.message };
  }

  revalidatePath("/admin/students");
  return { success: true, batchId: data.id };
}

export async function listBatches(institutionId: string) {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("batches")
    .select("id, name, active, created_at")
    .eq("institution_id", institutionId)
    .eq("active", true)
    .order("name");

  return (data ?? []) as { id: string; name: string; active: boolean; created_at: string }[];
}

// ── Student actions ───────────────────────────────────────────────────────────

export type StudentActionState = { error?: string; success?: boolean; loginId?: string } | null;

export async function createStudent(
  _prev: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const ctx = await getCallerAdminContext();
  if (!ctx) return { error: "Not authorised." };

  const fullName   = (formData.get("full_name")   as string).trim();
  const emailRaw   = (formData.get("email")        as string | null)?.trim().toLowerCase() || "";
  const password   = (formData.get("password")     as string);
  const rollNumber = (formData.get("roll_number")  as string | null)?.trim() || null;
  const batchId    = (formData.get("batch_id")     as string | null) || null;

  if (!fullName || fullName.length < 2) return { error: "Please enter the student's full name." };
  if (!password || password.length < 6) return { error: "Password must be at least 6 characters." };

  // Email is optional. If blank, we use a fake email based on roll_number.
  // Students with fake emails log in via Student ID + School dropdown.
  const loginId = rollNumber || fullName.toLowerCase().replace(/\s+/g, ".");

  const admin = createAdminClient();
  if (!admin) return { error: "Server not configured." };

  const slug = await getInstitutionSlug(admin, ctx.institutionId);
  const email = emailRaw && emailRaw.includes("@")
    ? emailRaw
    : buildStudentFakeEmail(loginId, slug);

  // Create auth user with email pre-confirmed (no verification email sent).
  // School communicates credentials to student directly.
  const { data: userData, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,           // ← skip email verification per product decision
    user_metadata: { display_name: fullName }
  });

  if (userErr) {
    if (userErr.message.includes("already")) return { error: "A student with this email already exists." };
    return { error: userErr.message };
  }

  const studentId = userData.user.id;

  // Update profiles row (created by trigger with role=unassigned) to role=student.
  await admin.from("profiles").update({
    role: "student",
    institution_id: ctx.institutionId,
    display_name: fullName
  }).eq("id", studentId);

  // Insert student_profiles.
  const { error: spErr } = await admin.from("student_profiles").insert({
    profile_id:     studentId,
    institution_id: ctx.institutionId,
    full_name:      fullName,
    roll_number:    rollNumber,
    login_id:       loginId,
  });

  if (spErr) {
    // Rollback: delete the auth user so the admin can retry.
    await admin.auth.admin.deleteUser(studentId);
    if (spErr.message.includes("unique")) return { error: "A student with this roll number already exists in this school." };
    return { error: spErr.message };
  }

  // Assign to batch if one was selected.
  if (batchId) {
    await admin.from("batch_memberships").insert({
      institution_id: ctx.institutionId,
      batch_id:       batchId,
      student_id:     studentId
    });
  }

  revalidatePath("/admin/students");
  return { success: true, loginId };
}

export async function listStudents(institutionId: string) {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("student_profiles")
    .select(`
      profile_id, full_name, roll_number, login_id, active, created_at,
      profiles(email),
      batch_memberships(batch_id, batches(name))
    `)
    .eq("institution_id", institutionId)
    .order("full_name");

  return (data ?? []) as unknown as {
    profile_id: string;
    full_name: string;
    roll_number: string | null;
    login_id: string | null;
    active: boolean;
    created_at: string;
    profiles: { email: string } | null;
    batch_memberships: { batch_id: string; batches: { name: string } | null }[];
  }[];
}

// ── School ZIP import ─────────────────────────────────────────────────────────

export async function importStudentsFromZip(
  students: ParsedStudent[],
  defaultPassword: string
): Promise<{ created: number; errors: string[] }> {
  const ctx = await getCallerAdminContext();
  if (!ctx) return { created: 0, errors: ["Not authorised."] };
  if (defaultPassword.length < 8) {
    return { created: 0, errors: ["Password must be at least 8 characters."] };
  }

  const admin = createAdminClient();
  if (!admin) return { created: 0, errors: ["Server not configured."] };

  const slug = await getInstitutionSlug(admin, ctx.institutionId);
  let created = 0;
  const errors: string[] = [];

  for (const s of students) {
    try {
      const loginId = s.rollNumber || s.name.toLowerCase().replace(/\s+/g, ".");
      const email   = s.email && s.email.includes("@")
        ? s.email
        : buildStudentFakeEmail(loginId, slug);

      // Create auth user
      const { data: userData, error: userErr } = await admin.auth.admin.createUser({
        email,
        password:      defaultPassword,
        email_confirm: true,
        user_metadata: { display_name: s.name }
      });
      if (userErr) { errors.push(`${s.name}: ${userErr.message}`); continue; }

      const studentId = userData.user.id;

      await admin.from("profiles").update({
        role: "student",
        institution_id: ctx.institutionId,
        display_name: s.name
      }).eq("id", studentId);

      const { error: spErr } = await admin.from("student_profiles").insert({
        profile_id:     studentId,
        institution_id: ctx.institutionId,
        full_name:      s.name,
        roll_number:    s.rollNumber,
        login_id:       loginId,
        phone_number:   s.phone,
        // Extra fields from info.json stored as JSONB
        field_values:   {
          ...(s.section    ? { section:       s.section }    : {}),
          ...(s.batch      ? { batch:         s.batch }      : {}),
          ...s.extraFields
        }
      });

      if (spErr) {
        await admin.auth.admin.deleteUser(studentId);
        errors.push(`${s.name}: ${spErr.message}`);
        continue;
      }

      // Upload photos to standalone-photos bucket and register in face_enrolments
      for (let pi = 0; pi < s.photos.length; pi++) {
        const photo = s.photos[pi];
        const ext   = photo.name.split(".").pop() ?? "jpg";
        const path  = `school/${ctx.institutionId}/${studentId}/photo_${pi}.${ext}`;
        const bytes = await photo.arrayBuffer();

        const { error: storErr } = await admin.storage
          .from("standalone-photos")
          .upload(path, bytes, { contentType: photo.type, upsert: true });

        if (storErr) {
          errors.push(`${s.name} photo ${pi + 1}: ${storErr.message}`);
          continue;
        }

        // Insert face_enrolments — try with Migration 008 columns first, fallback without
        const baseEnrol = {
          student_id:     studentId,
          institution_id: ctx.institutionId,
          image_path:     path,
          school_locked:  true,   // school uploaded → locked
        };
        const { error: enrolErr } = await admin
          .from("face_enrolments")
          .insert({ ...baseEnrol, uploaded_by_role: "school" });

        if (enrolErr && enrolErr.message.includes("uploaded_by_role")) {
          // Migration 008 not applied yet — insert without the column
          await admin.from("face_enrolments").insert(baseEnrol);
        }
      }

      created++;
    } catch (e) {
      errors.push(`${s.name}: ${(e as Error).message}`);
    }
  }

  revalidatePath("/admin/students");
  return { created, errors };
}

type AdminStudentPhoto = {
  id: string;
  image_path: string;
  school_locked: boolean;
  uploaded_by_role: "school" | "student" | null;
  created_at: string;
  signed_url: string;
};

/** Return signed face-photo URLs only when the caller administers the student's institution. */
export async function getStudentPhotosAdmin(studentId: string): Promise<AdminStudentPhoto[]> {
  const ctx = await getCallerAdminContext();
  if (!ctx) return [];

  const admin = createAdminClient();
  if (!admin) return [];

  const { data: photos, error } = await admin
    .from("face_enrolments")
    .select("id, image_path, school_locked, uploaded_by_role, created_at")
    .eq("student_id", studentId)
    .eq("institution_id", ctx.institutionId)
    .order("created_at");

  if (error || !photos?.length) return [];

  const paths = photos.map(photo => photo.image_path);
  const { data: signedUrls } = await admin.storage
    .from("standalone-photos")
    .createSignedUrls(paths, 3600);
  const signedUrlByPath = new Map((signedUrls ?? []).map(item => [item.path, item.signedUrl ?? ""]));

  return photos.map(photo => ({
    id: photo.id,
    image_path: photo.image_path,
    school_locked: photo.school_locked,
    uploaded_by_role: photo.uploaded_by_role as "school" | "student" | null,
    created_at: photo.created_at,
    signed_url: signedUrlByPath.get(photo.image_path) ?? "",
  }));
}

/** Update a photo lock only after confirming it belongs to the caller's institution. */
export async function togglePhotoLock(
  photoId: string,
  locked: boolean
): Promise<{ error?: string; success?: boolean }> {
  const ctx = await getCallerAdminContext();
  if (!ctx) return { error: "Not authorised." };

  const admin = createAdminClient();
  if (!admin) return { error: "Server not configured." };

  const { data: photo, error: photoError } = await admin
    .from("face_enrolments")
    .select("id")
    .eq("id", photoId)
    .eq("institution_id", ctx.institutionId)
    .maybeSingle();
  if (photoError || !photo) return { error: "Photo not found." };

  const { error: updateError } = await admin
    .from("face_enrolments")
    .update({ school_locked: locked })
    .eq("id", photoId)
    .eq("institution_id", ctx.institutionId);
  if (updateError) return { error: updateError.message };

  revalidatePath("/admin/students");
  revalidatePath("/student");
  return { success: true };
}
