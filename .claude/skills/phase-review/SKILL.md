---
name: phase-review
description: Check a build phase against its acceptance criteria before moving on. Use at the end of any phase from docs/07-build-plan.md.
argument-hint: [phase-number]
context: fork
disable-model-invocation: true
---

Review phase $ARGUMENTS against its acceptance criteria in @docs/07-build-plan.md.

Report, in this order:
1. Each acceptance criterion, PASS or FAIL, with the evidence (test name, file, manual step).
2. Anything built that is **not** in this phase's scope — building ahead is a defect.
3. Anything in @docs/09-anti-requirements.md that has crept in.
4. Any `DECISION-PENDING` comment silently resolved without a decision recorded in
   `docs/decisions/`.

Be blunt. A phase that half passes has not passed.
