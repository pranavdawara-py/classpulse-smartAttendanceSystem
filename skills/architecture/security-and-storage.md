# Security, authentication, and storage architecture

## Authentication and authorisation

Supabase Auth is the selected identity provider. The API validates tokens, resolves the application user/membership, and enforces role plus institution scope for every operation. Frontend route guards are usability features only; FastAPI and database/RLS are enforcement layers. Until environment values are configured, the application exposes configuration guidance rather than a bypass.

## Storage

Keep profile/enrolment images in a private bucket under a non-guessable, institution-scoped key such as `institutions/{institution_id}/students/{student_id}/enrolments/{enrolment_id}`. Store keys, media metadata, quality result, and model version in the database. Use short-lived signed URLs only when necessary. Never make enrolment images public by default, but permit the student and authorised school administrator to view them; teachers see only the current profile image for relevant lecture students.

## Secrets and logs

Use environment variables for server-only credentials; commit `.env.example`, never `.env`. Redact tokens, images, embeddings, guardian numbers, and biometric match vectors from logs/errors. Apply size/type checks, malware scanning strategy if available, rate limits, and explicit deletion/retention policies before non-demo deployment.

## Privacy guardrails

Require an institution-defined lawful consent process before enrolment; record consent/version and support disabling/deleting an enrolment. Limit capture use to attendance, communicate uncertainty, and preserve teacher control. New enrolment photos must match the existing approved identity cluster before approval; profile selection is limited to approved enrolments. Legal requirements vary by jurisdiction and require local review before real use.
