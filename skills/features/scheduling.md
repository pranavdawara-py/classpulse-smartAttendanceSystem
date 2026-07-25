# Scheduling and lectures

## Purpose

Give teachers a dependable view of assigned lessons while representing exceptions correctly.

## Behaviour

Administrators create teacher assignments (batch/sub-batch + course) and recurring weekly templates. The system materialises or displays dated lecture occurrences. Teachers may create extra lectures only for their assigned batch/course combinations, select an entire group or named students, reschedule an occurrence, and cancel it. Permissions for template editing versus occurrence editing are explicit.

## Rules and edge cases

- A recurrence is never the attendance record; a lecture occurrence is.
- Rescheduling keeps original/new times, editor, and edit time; cancellation also records actor/time and forbids new attendance. Affected students see updates immediately in-app.
- Custom attendee selection is snapshotted into `lecture_students`. Teachers may make lecture-specific roster edits before or after attendance, including a temporary attendee with a roll number or temporary reference.
- Conflicting times show a warning, not an automatic block, unless institution policy later requires it.
- Timezone/DST use the institution timezone. Past attended lectures cannot be silently rescheduled.

Teachers do not send special notifications to school for extra/cancelled/rescheduled lessons in MVP; school views a bracketed audit label such as `(created by teacher)` or `(cancelled by teacher)` in its system.

Out of scope: room optimisation, complex substitution automation, calendar sync.
