# Phase 7 technical review — 2026-10-05

**Result: report software PASS on examples; production scorecard and data acceptance PENDING.**

All 18 report IDs in `docs/05-reports.md` now have server-rendered routes using the
shared filter bar. Phase 7 specifically adds B2, B3, C1, C2, D2, D3, E1, E2, E3,
and G1. The catalog also includes A1, B4, and G2. `tests/e2e/phase7.py`
rendered all 13 added routes after login in the disposable database with no client
errors. `npm run lint`, `npm test` (39 tests), and `npm run build` passed.

| Acceptance criterion | Result | Evidence |
|---|---|---|
| D2 slip curve with escalation thresholds | PASS on examples | Per-order monthly review points show cumulative slip, stage and expected date. The disposable browser check displayed 32 and 62 day points and the manager/GM threshold colors. |
| D2 booking delay and cause | PASS on examples | Late and overdue bookings have a structured cause field. Browser check wrote `payment_outstanding`, saw it on D2 and restored the fixture. |
| G1 list-to-realized waterfall | PASS with estimate label | Shipped orders only; quotation discounts, order adjustment, accrued commission, recorded leakage and recovery are separate steps. Open orders and missing accruals are disclosed. Discount leakage memo entries do not double count the quotation discount. |
| Quarterly snapshots | PASS as a runnable idempotent job | `jobs:quarterly` created two Q3 example snapshots; retry created zero. Rows are insert-only, one partner/quarter. Unit tests cover quarter boundaries and consecutive-quarter counting. |
| No scorecard before four quarters | PASS | The B2 route shows unpublished `unrated` snapshots. Publication has no implementation path while market-size bands and scoring thresholds are absent. |

The report calculations currently load matching operational records into application
memory; large ERP histories require database aggregation, pagination and performance
testing before production. Counts and monetary figures use the example data, not
historical ERP exports. B1 can estimate old commission records from contract terms
and labels that fallback. G1 excludes unshipped bookings from realized value.

Remaining operational inputs: four observed quarters, market-size bands, agreed
score thresholds, dated FX for mixed-currency scorecards, a factory capacity
baseline, a territory universe, and deployment-host validation of the nightly and
quarterly worker. Real claims, parts, warranty and order history must be imported
before management uses the reports for decisions. Physical Phase 3 and 4b gates
remain open.

Cross-cutting hardening added after the report check: migration 0020 installs an
append-only audit table with row triggers on business tables. Password hashes,
file bodies and login-attempt keys are omitted. The rolled-back database check
in `tests/e2e/audit.sql` verified capture, redaction and update refusal.

Deployment hardening after this review added a Compose worker and one-time
migration service. The worker ran against the disposable database, created no
duplicate Q3 snapshots, and retried no failed work in that check. Its schedule
math has a 02:00 Taipei unit case. The Compose stack itself still requires a
deployment-host smoke test.
