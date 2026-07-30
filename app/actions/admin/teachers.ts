"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

// ── Invite teacher ─────────────────────────────────────────────────────────────

export type TeacherActionState = { error?: string; success?: boolean } | null;

export async function inviteTeacher(
  _prev: TeacherActionState,
  formData: FormData
): Promise<TeacherActionState> {
  const ctx = await getCallerAdminContext();
  if (!ctx) return { error: "Not authorised." };

  const fullName = (formData.get("full_name") as string).trim();
  const email    = (formData.get("email")     as string).trim().toLowerCase();

  if (!fullName || fullName.length < 2) return { error: "Please enter the teacher's full name." };
  if (!email || !email.includes("@"))   return { error: "Please enter a valid email address." };

  const admin = createAdminClient();
  if (!admin) return { error: "Server not configured." };

  // Step 1 — invite via Supabase (creates auth.users row immediately, sends invite email).
  const { data: invite, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { display_name: fullName }
  });

  if (inviteErr) {
    // "User already registered" means teacher already has an account — still safe to proceed.
    if (!inviteErr.message.toLowerCase().includes("already")) {
      return { error: inviteErr.message };
    }
  }

  // Step 2 — regardless of whether invite or pre-existing, look up the user.
  const teacherId = invite?.user?.id;
  if (!teacherId) {
    // Fallback: look up by email using admin list.
    const { data: listData } = await admin.auth.admin.listUsers();
    const found = listData?.users.find(u => u.email === email);
    if (!found) return { error: "Could not locate user after invite. Try again." };
  }

  const resolvedId = teacherId ?? (
    (await admin.auth.admin.listUsers()).data?.users.find(u => u.email === email)?.id
  );
  if (!resolvedId) return { error: "Could not resolve user ID." };

  // Step 3 — update profiles + insert teacher_profiles (service role bypasses RLS).
  await admin.from("profiles").update({
    role: "teacher",
    institution_id: ctx.institutionId,
    display_name: fullName
  }).eq("id", resolvedId);

  const { error: tpErr } = await admin.from("teacher_profiles").upsert({
    profile_id:     resolvedId,
    institution_id: ctx.institutionId,
    full_name:      fullName
  }, { onConflict: "profile_id" });

  if (tpErr) return { error: tpErr.message };

  revalidatePath("/admin/teachers");
  return { success: true };
}

// ── List teachers ─────────────────────────────────────────────────────────────
// Called from the server component page — uses the caller's session (anon RLS policy covers admin).

export async function listTeachers(institutionId: string) {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("teacher_profiles")
    .select("profile_id, full_name, active, created_at, profiles(email)")
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: true });

  return (data ?? []) as unknown as {
    profile_id: string;
    full_name: string;
    active: boolean;
    created_at: string;
    profiles: { email: string } | null;
  }[];
}
