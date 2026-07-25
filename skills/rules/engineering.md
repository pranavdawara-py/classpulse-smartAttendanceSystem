# Engineering rules

- TypeScript strict mode and Python type hints for public service boundaries.
- Keep route handlers thin; domain services own state transitions; repositories/adapters isolate data and integrations.
- Validate API input/output schemas; use stable error codes and non-sensitive messages.
- Test attendance transitions, tenant isolation, permissions, scheduling exceptions, and CV-provider contract with fakes. Add end-to-end coverage for the teacher confirm path before demo.
- Accessibility: labelled controls, keyboard support where relevant, contrast, focus states, and no colour-only attendance meaning.
- Update the authoritative skill document when an accepted decision or user-visible rule changes.
