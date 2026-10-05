# Phase 1 technical review — 2026-10-01

**Result: PASS with worked-example data.** The user approved using the supplied examples
while the historical ERP export is gathered. Phase 0's real-data management finding is
still outstanding; no production history has been imported.

## Acceptance criteria

| Criterion from `07-build-plan.md` | Result | Evidence |
|---|---|---|
| User can log in | PASS | `tests/e2e/phase1.py`: administrator and sales sign-in; deactivated user is refused |
| User can switch locale | PASS | Same browser suite switches English → Traditional Chinese → English and checks navigation |
| CRUD partners | PASS | Browser suite creates and edits a partner, saves a compliance profile, and terminates the lifecycle while retaining the record |
| CRUD items | PASS | Browser suite creates and edits a bilingual `spec_change` item, checks its Chinese name, then archives it |
| CRUD machine models | PASS | Browser suite creates and edits a model, then deactivates it |
| CRUD price book versions | PASS | Browser suite creates, edits, and archives a draft; published periods reject overlap in PostgreSQL |
| Chinese item names display | PASS | Browser suite checks `驗收主軸變更` in the item list |

The Phase 1 schema covers `02-data-model.md` §§4.1–4.3. PostgreSQL 16.15 applied both
migrations. Seeding loaded 9 models, 13 categories, 2 partners, 7 items and 3 price-list
rows. `src/db/smoke.ts` passed against the local database. PostgreSQL directly rejected
an overlapping published price-book period and a case-insensitive duplicate user email.
The browser suite ran against an isolated `kaoming_e2e` database, which was removed after
the review; the main example database remains intact.

`npm run lint`, `npm test` (17 tests), and `npm run build` all passed. The browser
suite caught two runtime defects missed by static checks: a raw SQL `Date` parameter in
the login throttle and a non-function export from a server-action file. Both were fixed
and the suite passed afterward.

## Scope and open decisions

The additional user administration and login throttling support Phase 1 identity and
access. Compliance profiles belong to the Phase 1 channel schema. No quotation, price
list import, document generation, logistics, or reporting workflow was built ahead.
Review against `09-anti-requirements.md` found no prohibited feature in this phase.

The D8 and D12 defaults are called out with `DECISION-PENDING` comments in the channel
schema. Other business decisions are not exercised by Phase 1 workflows. Real ERP data,
agent master confirmation, and business-owner decisions remain prerequisites for later
production use.
