# 001 — MVP and platform

**Status:** Accepted (2026-07-24)

## Decision

Build one mobile-first responsive web application, PWA-compatible where practical, rather than a native mobile or Windows app. Prioritise the teacher attendance flow and retain desktop responsiveness for future reporting and webcam use. Support both live camera and uploaded recording as permanent inputs to the same attendance pipeline.

## Why

Teachers need phone-camera attendance in classrooms. A web app has the shortest hackathon path, avoids app-store distribution, and works across phones, tablets, and laptops.

## Alternatives

- Native mobile: better deep device integration but doubles delivery effort.
- Desktop-first: conflicts with the primary classroom workflow.
- Full ERP: dilutes the core demo.

## Consequences

Camera permission, unsupported-browser, slow-network, upload, processing, and offline-record-then-upload states are first-class UX requirements. Native packaging can be revisited later.
