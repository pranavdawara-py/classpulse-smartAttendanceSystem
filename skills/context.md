# Smart Attendance Platform

## Purpose

This is a hackathon MVP for schools, colleges, coaching institutes, and training centres. It reduces manual roll call by using camera-based face recognition to *suggest* attendance, then requires a teacher to review, correct, and confirm it.

The product is deliberately not a school ERP. The complete polished path is: institution setup -> people and groups -> schedule/lecture -> camera capture -> recognition suggestion -> teacher review -> confirmed attendance -> student/parent viewing.

## Product boundaries

In scope: one school administrator account, teachers, student accounts, flexible student fields, batches and reusable sub-batches, courses, recurring schedules, real lecture instances, cancellations/rescheduling/extra classes, face enrolment, live-camera and uploaded-video attendance, teacher-confirmed attendance, history, and student attendance/timetable viewing.

Out of scope: marks, fees, homework, full messaging, advanced analytics, and a separate sophisticated parent identity system.

## Accepted direction

- Mobile-first responsive web app/PWA: phone is the primary teacher device; tablet and desktop remain supported.
- Frontend: Next.js, React, TypeScript, Tailwind CSS.
- Backend: Python/FastAPI, with CV isolated behind an interface.
- Data: Supabase-managed PostgreSQL and private object storage; images in object storage, metadata/references in PostgreSQL.
- Attendance is never final until a teacher confirms it. Unknown or low-confidence faces are never auto-assigned.
- The UI uses school-oriented terms for the MVP while the underlying model stays general enough for colleges, coaching, and training providers.
- The main attendance entry is **Record attendance -> choose lecture -> Live camera or Upload video -> review -> confirm**.

## Constraints

- No paid service, credit card, or billing enablement. Current free-plan terms must be checked immediately before deployment.
- Biometric data is sensitive: tenant isolation, private storage, least privilege, and no secrets in Git are mandatory.
- Keep the MVP narrow and deployable for a hackathon.

Read decisions and architecture documents before implementation. Status labels distinguish accepted principles from proposed technical choices.
