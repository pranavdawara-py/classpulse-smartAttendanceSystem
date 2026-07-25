# 003 — Face recognition selection

**Status:** Open — research/prototype required

## Decision principle

Define a provider interface that emits detected faces, embedding/match candidates, confidence, and diagnostics. Attendance business rules consume that interface, never a library directly.

## Current recommendation

Prototype a CPU-compatible ONNX-based detector/embedder behind the interface, using controlled enrolment and conservative thresholds. Require three active, mutually matching face-enrolment images before recognition is enabled. Do **not** accept InsightFace bundled pretrained models for a public project without obtaining/confirming a model licence: the upstream repository states that its code is MIT while the published pretrained models have non-commercial research restrictions.

## Acceptance criteria

Evaluate multi-face classroom photos/video, latency on intended CPU host, false-positive/false-negative behaviour, package/model size, model provenance/licence, and repeatable threshold calibration using consented test subjects. Also evaluate phone detection plus face/phone overlap as a *warning* signal for possible screen spoofing. No model is authorised for production merely because it runs.
