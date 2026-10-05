# Phase 2 technical review — 2026-10-01

**Result: PASS on the supplied worked examples.** The user approved example data while
the historical ERP export and master data are gathered. This review does not certify
production data, a live deployment, or the later Chinese document workflow.

## Acceptance criteria

| Criterion from `07-build-plan.md` | Result | Evidence |
|---|---|---|
| Quote a deal at r1, revise to r3 with a line discount | PASS | `tests/e2e/phase2.py` creates r1 and r2/r3 after a price book change, enters a line discount, and checks old issued prices and PDF remain unchanged; `quote-math.test.ts` checks the worked example's 871,590 / 183,590 / 688,000 totals |
| G1 and G2 refuse premature issue server-side | PASS | `issueQuotation` in `src/features/deals/service.ts` checks the confirmed design review, revision-specific technical proposal, and department manager then GM approvals; `tests/e2e/phase2.py` submits premature issue actions and checks the G1/G2 refusals |
| PDF matches the seeded Q-2026-0147 layout | PASS | `tests/e2e/pdf_review.py` generated a one-page A4 PDF. Visual inspection confirmed header/reference, machine and option groups, excluded item, crossed-out list total, net USD 688,000, terms, and revision footer. The underlying seed preserves all ten worked-example lines. No original paper quotation was supplied for a historical print comparison |
| Upload, validate, preview, publish; G12 blocks outstanding errors | PASS | `import-data.test.ts` covers CSV/XLSX parsing and row errors; `tests/e2e/phase2.py` checks row-numbered validation, diff confirmation refusal, publish, and unchanged issued price snapshots. `publishPriceImport` revalidates the retained source in a transaction |

PostgreSQL 16.15 applied migrations 0000–0005 to a fresh disposable database. The
seeded example and browser flow passed. `tests/e2e/issued-immutability.sql` confirmed
that PostgreSQL rejects direct edits to an issued quotation total and line price.
`npm test` passed 23 tests, `npm run lint` passed, and `npm run build` passed. The
disposable browser database is separate from the main example database.

## Scope

The customer list/create screen and revision-specific proposal upload support deals and
G1. The three-part generated proposal and Chinese PI/MI/specification documents remain
Phase 3 work. No order, shipment, service, claims, or dashboard workflow was built
ahead. The review found no feature prohibited by `09-anti-requirements.md`.

`DECISION-PENDING` comments remain for D4, D5, D8, D12, D19, and the unspecified lost
reason vocabulary. No pending decision was silently recorded as resolved.

## Gate check at this phase

| Gate | Server location | Server-side refusal | Integration refusal test | Verdict |
|---|---|---|---|---|
| G1 | `src/features/deals/service.ts` `issueQuotation` | Yes | `tests/e2e/phase2.py` | PASS |
| G2 | `src/features/deals/service.ts` `approveQuotationDiscount`, `issueQuotation` | Yes | `tests/e2e/phase2.py` | PASS |
| G3 | Deal/order transition, Phase 3 | Not built | No | Future phase |
| G4 | Work order issue, Phase 3 | Not built | No | Future phase |
| G5 | Booking transition, Phase 4b | Not built | No | Future phase |
| G6 | Machine acceptance, Phase 4 | Not built | No | Future phase |
| G7 | Commission settlement, Phase 6 | Not built | No | Future phase |
| G8 | Parts quotation, Phase 6 | Not built | No | Future phase |
| G9 | Document release, Phase 3 | Not built | No | Future phase |
| G10 | Site visit close, Phase 4 | Not built | No | Future phase |
| G11 | MI issue, Phase 3 | Not built | No | Future phase |
| G12 | `src/features/price-book/service.ts` `publishPriceImport` | Yes | `tests/e2e/phase2.py` | PASS |
| G13 | Case close, Phase 6 | Not built | No | Future phase |

## Remaining prerequisites and risk

The real ERP export, complete item/agent/price masters, open orders, and business-owner
confirmation of the outstanding decisions are still needed before production data can
replace the examples. A dependency audit after replacing the unmaintained `xlsx`
reader reports 16 advisories (8 moderate, 7 high, 1 critical), including runtime
packages Drizzle ORM, Puppeteer, and Next.js dependencies. The critical Vitest issue is
in development tooling. Dependency upgrades and a fresh audit are required before a
production deployment; this phase acceptance covers functionality, not release readiness.
