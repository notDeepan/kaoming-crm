# Phase 4 technical review — 2026-10-02

**Technical result: PASS on example data.** The earlier Phase 3 physical PI/MI gate
remains open; the user directed the build to continue phase by phase.

| Acceptance criterion | Result | Evidence |
|---|---|---|
| MI issues monthly reviews through contractual date + six months | PASS | `issueWorkOrder` inserts review rows in the same transaction as the issued MI. `tests/e2e/phase4.py` counted 16 rows for the worked example. |
| Expected-date movement raises escalation above 30 and 60 days | PASS | The browser test entered 32 and 62 days of slip and read `dept_manager` and `gm` from the database. `dates.test.ts` checks the strict boundaries. |
| Slip is attributed to the stage reported that month | PASS | The browser test recorded `machining` and `assembly` on separate monthly rows with the moved dates, reason and attribution. |
| Past-due unfilled review surfaces an exception | PASS | The browser test moved an open review due date into the past in the disposable database and saw the manager exception. The production queue aggregates overdue rows. |
| G10 refuses visit closure without condition photos | PASS | The browser test observed the server refusal, uploaded an authenticated PNG, closed the visit, and recorded installation and acceptance dates separately. |

FAT checklist rows are copied from the latest issued specification. A passed FAT
requires all checklist items verified and closes unfilled monthly reviews. Shipment
requires final payment, a passed FAT and the printed 出貨單, and creates the installed
machine record atomically. Acceptance starts the warranty clock after a closed
installation visit.

The clean browser chain `phase2.py`, `phase3_configuration.py`, `phase3_pi.py`,
`phase3_mi.py`, `phase4.py` passed. This evidence uses illustrative data. On
2026-10-05 the condition photo model was extended with a shipment link: FAT and
loading photos can now be captured before shipment and linked to the machine
atomically when its serial is registered. `phase4_photos.py` verified a pre-shipment
FAT upload in the disposable database. Physical photo procedure and retention
requirements still need Kao Ming confirmation.
