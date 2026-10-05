# Phase 6 review — 2026-10-04

**Result: TECHNICAL CORE PASS on examples; overall phase INCOMPLETE.**

| Acceptance criterion | Result | Evidence |
|---|---|---|
| Count and surface `undeterminable` warranty requests | PASS | Parts queue has an explicit count and detail warning; browser check opened an unknown-machine request and read the stored determination. |
| Commission accrues at order confirmation | PASS on examples | `markDealWon` inserts an as-of-order contract accrual in the same transaction. Browser check found a zero accrual for a markup partner; unit cases cover commission bases. |
| Penalty exposure recalculates from slip, rate and cap | PASS as runnable job | `src/jobs/nightly.ts` is idempotent. The disposable example with 14 days of slip calculated two weeks and USD 8,278.50 exposure, capped at USD 41,392.50. Compose now runs the worker daily; host validation is pending. |
| Case can be opened, translated both ways, moved and closed | PASS with human translation | Browser check recorded English→Chinese and Chinese→English messages, reviewed and marked an outbound message sent, traversed the states and closed. Automatic draft translation has not been integrated. |
| G13 refuses untranslated closure | PASS | Browser check attempted closure with missing translation; status remained resolved. |
| Time in case state queryable | PASS | Every transition creates a `case_state_log` row. `timeInState` aggregates repeated waits; unit case covers it. |
| Parts handoffs and approvals | PASS on examples | Identification and pricing have separate waits. G17 checks part and price; G18 rejected self approval; a second manager approved, completed G8 terms and issued a one-page PDF. |
| Leakage register | PASS on examples | Claim settlements create a unique linked entry; `phase6_links.py` submitted a manual entry and linked an existing claim to a compatible case through the browser. |

Remaining for production: a reviewed translation provider and privacy decision,
real spare part master/stock/pricing inputs, physical supervisor terms validation,
historical contract and warranty data, and deployment-host validation of the nightly
worker. The current case UI records human translations. It does not label them as
machine generated. The Phase 3 and 4b paper gates remain open independently.
