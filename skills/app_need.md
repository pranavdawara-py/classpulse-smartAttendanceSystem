# Why ClassPulse Is Needed

**Research date:** 2026-07-25  
**Status:** Living product-research brief. Sources must be rechecked before deployment or public claims.

## Problem

Manual roll call is reliable, inexpensive, understandable, and keeps a teacher in control, but it takes classroom time, produces delayed records, and is awkward when schedules, batches, and student lists change. Existing camera-based products show that the technology is available, yet adoption remains uneven because face recognition creates risks that ordinary attendance software does not.

ClassPulse should solve the narrow operational problem—fast, teacher-confirmed attendance—without pretending that a camera result is automatically trustworthy.

## Current camera-based attendance options

| Option | Typical operation | Strengths | Common limitations |
| --- | --- | --- | --- |
| Fixed face terminal at gate/entry | Student walks up to a dedicated face-recognition terminal. | Predictable camera angle and lighting; fits entry/exit attendance. | Hardware cost, queues, only proves gate passage rather than presence in a particular lesson. |
| CCTV/smart-camera recognition | One or more installed cameras identify faces as students enter or sit in a room. | Low teacher effort once installed; can cover large flows. | Camera placement, occlusion, crowding, consent/privacy concerns, installation/support cost. |
| Teacher phone/tablet live camera | Teacher scans the room using a browser/app camera. | No dedicated hardware; works for a particular lecture and supports teacher judgement. | Motion blur, lighting, student occlusion, phone/network constraints, false matches. |
| Uploaded classroom video | Teacher records then submits a video for the same frame-processing pipeline. | Useful when a different device was used or connectivity is unavailable during class. | Delayed result, large upload, privacy/retention burden, no guarantee that recording time equals lecture time. |
| Hybrid biometric/RFID/QR systems | Camera is combined with a card, QR, fingerprint, or manual roll call. | Fallback when camera cannot recognise someone. | More equipment/processes; QR/card systems can be shared or forgotten. |

Examples currently marketed in the school sector include fixed face/RFID devices and camera-based attendance (Micron ERP), CCTV/face-recognition systems (PELA), browser camera recognition (Educanize), and a product that advertises face-recognition video upload (AttendAI). Vendor claims are not independent evidence of accuracy. Sources: <https://www.micronerp.com/features/attendance>, <https://www.pelaschools.com/>, <https://www.educanize.com/>, <https://attendai.org/>.

## Why many schools still use manual attendance

### 1. A teacher can make a defensible decision in an imperfect classroom

Classrooms are difficult vision environments: faces are small, partly hidden, turned away, moving, wearing spectacles/masks, or affected by uneven light. A manual register makes the teacher the decision-maker immediately; camera software can create extra review work exactly when it gets uncertain. NIST notes that false negatives are strongly dependent on face-image quality, and that poor photography can itself induce demographic effects. Source: <https://pages.nist.gov/frvt/html/frvt_demographics.html>.

### 2. It is cheap, familiar, and needs almost no infrastructure

Manual roll call works with no camera hardware, model runtime, internet, staff training, identity-enrolment process, or vendor support. Fixed systems add devices and maintenance; phone/CCTV systems add connectivity, deployment, and support questions. Schools often choose the process that will still work during a network outage or when a teacher is unfamiliar with the app.

### 3. Biometric attendance creates high-stakes privacy responsibilities

Face images and embeddings are sensitive biometric data. Schools must explain purpose, control access, protect storage, retain data only as long as needed, handle withdrawals/deletion where required, and prevent use beyond attendance. The U.S. GAO identifies commercial facial recognition's privacy and accuracy issues, including student-attendance tracking as a use case. Source: <https://www.gao.gov/products/gao-20-522>.

### 4. Families and institutions worry about surveillance and mission creep

Schools may accept an attendance tool but reject creating a continuous tracking system. They need confidence that a face database cannot silently become behaviour monitoring, law-enforcement search, or location tracking. This is not theoretical: New York prohibited facial-recognition use in schools after a state analysis concluded educational-setting risks could outweigh benefits. Source: <https://apnews.com/article/ddd35e004254d316beabf70453b1a6a2>.

### 5. Accuracy and fairness cannot be assumed from a vendor percentage

Performance varies by model, camera quality, environment, and population. NIST reports that the majority of tested algorithms exhibited demographic differentials and documents the importance of image quality. Source: <https://www.nist.gov/news-events/news/2019/12/nist-study-evaluates-effects-race-age-sex-face-recognition-software>.

### 6. Schools fear proxy, spoofing, disputes, and accountability gaps

A photo or video displayed on a phone can attempt to fool a camera. Student absence or mistaken identity can become a parent/teacher dispute. NIST's current digital-identity guidance says facial recognition systems shall implement presentation-attack detection; this does not mean every available implementation is sufficient. Source: <https://pages.nist.gov/800-63-4/sp800-63b.html>.

### 7. Existing school processes are broader than one attendance mark

Attendance is tied to batches, changing timetables, substitute/extra classes, late roster changes, student access, reports, and policy. A camera feature alone can be less useful than a fast manual register integrated with the actual lecture roster.

## Concerns a school will reasonably ask before adoption

1. **Accuracy:** What happens with spectacles, changed appearance, masks, weak light, a crowded room, or similar-looking students?
2. **False decisions:** Can a teacher correct every suggestion before it is saved? Is there a record of correction?
3. **Spoofing:** Does the system treat a face on a phone as a warning, rather than silently marking a person present?
4. **Privacy:** Where are images/embeddings stored, who can view them, and how are they deleted?
5. **Consent and policy:** Is there a clear purpose, student/parent communication, and an alternative/manual process?
6. **Fairness:** Has the chosen model been tested with the institution's real, consented conditions rather than only vendor examples?
7. **Cost/reliability:** Does it work on ordinary teacher phones, what happens offline, and does it need paid hardware or constant internet?
8. **Workflow:** Can a teacher take attendance in seconds, handle exceptions, and continue teaching?
9. **Integration:** Does it respect the existing batch, subject, timetable, and student-account structure?
10. **Security:** Are storage private, roles restricted, secrets protected, and all edits auditable?

## Product response: the ClassPulse position

ClassPulse should be described as **AI-assisted, teacher-confirmed attendance**, not autonomous surveillance or indisputable biometric proof.

- The teacher selects the actual lecture and expected roster first.
- Live camera and uploaded video share one processing path.
- A match is only a suggestion; unknown/low-confidence faces do not become present automatically.
- Every student remains visible in the Present/Absent review list; the teacher can edit before confirmation and audited edits afterward.
- Multiple approved enrolment images reduce ordinary appearance-related mismatch; students can update them while keeping at least three active images.
- Phone/face overlap triggers a visible red warning and alarm, then asks the teacher to exclude, restart, or include after review. It is not an accusation or a reliable liveness claim.
- Private storage, institution isolation, role-based access, and no public biometric URLs are architectural requirements.
- Manual/temporary-attendee handling is retained: the product must still work when recognition does not.

## What must be proven in the hackathon

1. A teacher can complete a lecture attendance flow faster than manual roll call while retaining control.
2. The app handles errors honestly: low confidence, unknown faces, poor capture, upload failure, and phone-screen warning.
3. The school can see a comprehensible audit trail and manage enrolment/rosters.
4. The design does not claim universal accuracy, anti-spoofing, or legal compliance that has not been benchmarked.

## Research still required before real deployment

- Benchmark the selected licensed model with consented classroom-like video, including spectacles, lighting changes, face angles, occlusion, and intended demographics.
- Measure false warning/miss rates for phone detection and test a real presentation-attack-detection model if the feature is promoted as security.
- Obtain jurisdiction-specific legal/privacy advice for child/student biometrics, consent, retention, and deletion.
- Test Supabase RLS, signed URLs, deletion paths, and audit logs with real roles before handling live biometric data.
