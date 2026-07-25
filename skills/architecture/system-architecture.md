# System architecture

## Components

```text
Next.js PWA -> FastAPI domain API -> PostgreSQL
                         |-> recognition-provider interface -> model runtime
                         |-> private object storage
Supabase Auth -> signed user token -> Next.js/FastAPI validation
```

## Boundaries

- Next.js owns responsive UI, camera capture, and user-facing state; it never decides final attendance.
- FastAPI authorises every tenant-scoped request, owns lecture/attendance transitions, and invokes CV providers.
- PostgreSQL owns relational facts and audit metadata. Object storage owns image files. Embeddings are stored separately from images and are not exposed through normal student endpoints.
- A recognition provider owns detection, embedding, matching, and its model-specific concerns.

## Attendance lifecycle

`draft -> capture processing -> review_required -> confirmed`.

`cancelled` is valid before confirmation. Confirmation writes immutable-at-the-time attendance entries plus correction/audit metadata. Later correction must be an explicit audited amendment, not a silent overwrite.

## Tenant rule

Every domain row is associated with one institution (directly or through a verified relationship). Query scope and storage paths must be institution scoped; the client must never supply a tenant identity that the backend trusts without checking membership.
