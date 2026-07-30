-- Migration 008: Photo lock permissions, subject tagging, detection source tracking
-- All changes are additive (ADD COLUMN IF NOT EXISTS) — safe to push to remote.
-- No existing columns modified, no data dropped.

-- ─── 1. face_enrolments: photo lock + upload source ───────────────────────────
-- school_locked = true → only admin/teacher can delete this photo;
--                        student UI hides the delete button.
-- uploaded_by_role tracks who uploaded (school admin vs student self-upload).

ALTER TABLE public.face_enrolments
  ADD COLUMN IF NOT EXISTS school_locked    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS uploaded_by_role text
    CHECK (uploaded_by_role IN ('school', 'student'));

COMMENT ON COLUMN public.face_enrolments.school_locked IS
  'When true, only admin/teacher can delete this photo. Students see it but cannot remove it.';

COMMENT ON COLUMN public.face_enrolments.uploaded_by_role IS
  'Who uploaded this photo: school (admin/teacher) or student (self-upload).';

-- ─── 2. standalone_sessions: add subject label ────────────────────────────────
-- Allows Personal Mode teachers to tag sessions by subject (e.g. "Maths").
-- Used for filtering on the history page.

ALTER TABLE public.standalone_sessions
  ADD COLUMN IF NOT EXISTS subject text
    CHECK (subject IS NULL OR char_length(trim(subject)) BETWEEN 1 AND 100);

COMMENT ON COLUMN public.standalone_sessions.subject IS
  'Optional subject/topic label for Personal Mode session history filtering.';

-- ─── 3. standalone_attendance_entries: detection source + confidence ──────────
-- Tracks whether a present/absent mark came from camera recognition or
-- manual override. Confidence is the cosine similarity from the backend (0–1).

ALTER TABLE public.standalone_attendance_entries
  ADD COLUMN IF NOT EXISTS detection_source text NOT NULL DEFAULT 'manual'
    CHECK (detection_source IN ('camera', 'manual', 'override')),
  ADD COLUMN IF NOT EXISTS confidence numeric(6,5);

COMMENT ON COLUMN public.standalone_attendance_entries.detection_source IS
  'How this attendance mark was set: camera (auto), manual (teacher), override (corrected).';

COMMENT ON COLUMN public.standalone_attendance_entries.confidence IS
  'Cosine similarity from face recognition (0.0–1.0). NULL for manual marks.';

-- ─── 4. attendance_entries (school mode): detection source ────────────────────

ALTER TABLE public.attendance_entries
  ADD COLUMN IF NOT EXISTS detection_source text NOT NULL DEFAULT 'manual'
    CHECK (detection_source IN ('camera', 'manual', 'override'));

COMMENT ON COLUMN public.attendance_entries.detection_source IS
  'How this attendance mark was set: camera (auto), manual (teacher), override (corrected).';

-- ─── 5. RLS: students can read their own face_enrolments ──────────────────────
-- Current policy: student_id = auth.uid() OR admin.
-- No change needed — existing policy in migration 001 already covers this.
-- No new policies needed for the new columns.
