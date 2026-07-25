# Computer vision architecture

## Provider contract

The provider accepts a private image/capture reference and an allowed-student set. It returns zero or more face observations: bounding box, quality indicators, candidate student IDs limited to that set, similarity/confidence, and `matched | low_confidence | unknown` classification. It must not make attendance final. Live-camera frames and uploaded-video frames call this same contract.

## Enrolment

Require at least three active consented images, including spectacles/no-spectacles variants when applicable. Detect exactly one suitable face per image, reject poor/ambiguous images, compare a new enrolment to the existing approved cluster, create a versioned embedding, and retain quality/model provenance. A profile image must be an approved enrolment image. Never match across institutions.

## Recognition and safeguards

Process frames server-side; aggregate repeat observations conservatively across a camera session or uploaded recording. A matched student in at least one accepted capture becomes a suggested present, subject to teacher review. Thresholds are model/version-specific and must be calibrated. Low confidence remains reviewable; unknown remains unassigned. The teacher can mark present/absent or correct a suggestion before confirmation.

## Possible screen spoof warning

Run a separate phone/object detector on each sampled frame. When a face materially overlaps a detected phone, outline the phone in red, sound an alarm in the client, and require the teacher to choose: exclude the suspicious student from this session, restart attendance, or include after review. This is a warning heuristic, not reliable liveness proof; it must never automatically accuse a student or finalise attendance.

## Operational note

Provider runtime/model acquisition must be reproducible and licence documented. Test CPU-only deployment before selecting it; a model too large or slow for the free backend is not MVP-ready.
