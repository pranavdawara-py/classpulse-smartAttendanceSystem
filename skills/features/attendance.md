# Attendance and review

## Users and goal

Teachers start attendance for a valid lecture and remain accountable for the final record. Students/parents only view confirmed history.

## Flow

1. Teacher selects a lecture/slot under **Record attendance** and resolves expected students from its snapshot.
2. Teacher starts a draft session using live camera or uploads a previously recorded video.
3. The shared processing pipeline samples frames and returns suggestions, low-confidence candidates, unknowns, and possible screen-spoof warnings.
4. UI presents every expected student with a clear editable status; it does not hide absent/unseen students.
5. Teacher corrects outcomes, resolves every spoof warning (exclude, restart, or include after review), may add a temporary/manual attendee, and confirms.
6. System stores final entries and an audit trail of automated suggestion versus human decision.

## Rules

Only authorised assigned teachers/admins can act. Confirmation requires an explicit user action and is idempotent. Only `Present` and `Absent` are final MVP statuses. No automatic present mark for unknown/low confidence. Historical teacher edits are allowed and append audit events without notifying school in MVP. Network failure preserves a draft locally only if secure/reliable implementation is added; otherwise clearly report that it was not saved.
