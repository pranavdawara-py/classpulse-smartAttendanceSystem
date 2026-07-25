# Teacher attendance flow

## Entry and primary path

Teacher home highlights today's upcoming/current lectures and an obvious **Record attendance** action. Each card shows batch, subject, time, expected-student count, and optional classroom. Record attendance first selects a valid lecture/slot, confirms audience and schedule, then offers **Live camera** and **Upload video**.

## Camera state

Request camera permission only after the teacher acts. Live camera shows preview, start/stop scan, framing guidance, and flash/camera switch where supported. Upload video shows accepted format/size, upload and processing progress. Both routes use the same analysis. Clearly handle permission denied, no camera, unsupported browser, poor network, processing, and retry. Recording outside the app and later upload is supported.

## Review state

Show suggested present, needs-review, unknown faces, and every expected student. Provide **All**, **Present**, and **Absent** filters. Each row has a large touch-friendly status control and small profile photo. Display confidence as a caution cue, not certainty. A phone/face overlap warning draws a red phone outline, plays alarm, and offers exclude/restart/include-after-review. Teachers can add a temporary attendee. Sticky **Confirm attendance** requires an intentional confirmation; a clear success state links to history.

## Responsive requirements

One-column mobile layout, minimum comfortable touch targets, readable camera preview, and actions reachable near the thumb. On desktop, retain the same sequence and use wider two-pane review only when space allows.
