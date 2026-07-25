# 002 — Service boundaries

**Status:** Accepted (2026-07-25)

## Decision

Use Next.js for presentation and FastAPI for protected domain APIs and CV orchestration. Use Supabase Auth, PostgreSQL, and private object storage. The application must compile without credentials, but authentication/data actions report an actionable configuration state until Supabase environment values are supplied.

## Rationale

FastAPI is suitable for Python CV dependencies and keeps business rules out of browser code. Supabase offers aligned managed capabilities, while keeping PostgreSQL and storage concepts portable.

## Consequences

The browser must not receive service-role or database credentials. Backend-to-Supabase trust, JWT validation, RLS, and storage policies must be implemented and tested when a Supabase project is created. No fallback authentication bypass or seeded demo identity is permitted.

See `architecture/system-architecture.md` and `research/deployment-and-platform.md`.
