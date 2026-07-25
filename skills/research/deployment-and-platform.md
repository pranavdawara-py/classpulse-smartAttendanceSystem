# Deployment and platform research

**Checked:** 2026-07-25. **Status:** Supabase selected for implementation; needs final account-level configuration verification before deployment.

## Verified facts

- Supabase lists a Free plan with 500 MB database, 1 GB file storage, 50,000 MAU, two active projects, and pauses free projects after one week of inactivity. Source: <https://supabase.com/pricing>.
- Vercel lists Hobby as free, intended for personal/small-scale and restricted to non-commercial personal use; it publishes function/resource limits. Source: <https://vercel.com/docs/plans/hobby>.
- InsightFace's repository says its code is MIT but its downloadable/pretrained model material is for non-commercial research use. Source: <https://github.com/deepinsight/insightface>.

## Recommendation

Use Supabase Free only for a small hackathon demo, with a written wake-up/checklist because of one-week inactivity pausing. Treat Vercel Hobby as a candidate only if the project use fits its current non-commercial restriction. Do not select a backend host or CV model yet: a FastAPI CV runtime needs a real deploy test for cold start, memory, model size, CPU latency, outbound model download, and no-card sign-up.

## Open research tasks

1. Test Supabase project creation, Auth, private storage policies, and RLS without billing details.
2. Compare eligible no-card FastAPI hosts through an actual tiny image-inference deployment; record sleep/cold-start behaviour.
3. Select a pretrained model with documented licence suitable for the intended public hackathon use, then benchmark it against consented classroom-like images.
4. Confirm jurisdiction-specific biometric consent/retention requirements with the institution before handling real students.
5. Benchmark a phone/object detector together with face detection on both live camera and uploaded video; quantify false warnings before presenting the feature as a deterrent.
