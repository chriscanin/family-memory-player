---
description: Run the project's verification gate (typecheck, unit tests, iOS bundle)
---

Run these in order from the repo root and report a clear pass/fail for each,
then a one-line verdict on whether the change is safe to commit:

1. `npx tsc --noEmit` — typecheck (strict)
2. `npx jest` — unit tests (core logic)
3. `npx expo export --platform ios --output-dir /tmp/fmp-verify` — JS bundle smoke test

If any step fails, stop and surface the exact error; do not declare the work done.
This mirrors the "Definition of done" in AGENTS.md.
