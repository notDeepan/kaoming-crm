---
name: gate-check
description: Verify that gates G1 to G13 are enforced server-side and covered by tests. Use after any change to deals, quotations, orders, work orders, site visits, cases or documents.
context: fork
agent: Explore
---

Audit the gates in @docs/03-business-rules.md.

For each of G1 through G13, report:
1. Where the check lives (file and function).
2. Whether it refuses the transition **server-side**, not only in the UI.
3. Whether an integration test asserts the refusal.
4. Any gate that is missing, UI-only, or untested.

Output a table: Gate | Location | Server-side | Tested | Verdict.

Do not fix anything. Report only.
