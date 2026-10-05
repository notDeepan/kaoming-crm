# Phase 4c review — 2026-10-02

**Result: INCOMPLETE as a phase gate.** The claim workflow passes with example data.
The six actual German register entries have not been supplied, and case links cannot
be exercised until the Phase 6 case module exists.

| Acceptance criterion | Result | Evidence |
|---|---|---|
| Six German claims reproduced exactly | PENDING real data | No source register in the workspace; example claims exercised in `tests/e2e/phase4c.py`. |
| G19 method and amount required | PASS on examples | Browser test observed refusal and successful settlement. |
| G20 creates leakage for Kao Ming responsibility | PASS on examples | Browser test found exactly one linked leakage entry. |
| G21 credit remains open until applied | PASS on examples | Credit remained pending, was applied to a later same-agent order, then closed. |
| Briefing pack flags missing position and fits 1–2 pages | PASS on examples | Generated PDF was checked for page count and flag text. Physical visit review remains pending. |
| G2 claims report | NOT BUILT | Scheduled for report wave 2. |

The workflow records claim lines, the claimed, offered and settled amounts, positions,
next actions, events, responsibilities and settlement method. The briefing includes
machine serials, shipping variance, installed base, pending credits and final payment
follow-up. Exact reproduction and acceptance still depend on the real register.
