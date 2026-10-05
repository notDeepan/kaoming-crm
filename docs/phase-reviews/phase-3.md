# Phase 3 technical review — 2026-10-01

**Result: FAIL as a phase gate.** The example-data software checks pass. Printed PI and
MI forms have not yet been accepted by 生管, which `docs/07-build-plan.md` makes a
required acceptance condition. On 2026-10-02 the user explicitly directed the build
to continue phase by phase despite this external acceptance remaining open. This does
not convert the gate to a pass; production rollout still needs 生管's physical review.

## Acceptance criteria

| Criterion | Result | Evidence |
|---|---|---|
| Final quotation generates a three-part proposal and matching factory specification | PASS on examples | `tests/e2e/phase2.py` issues r3 with a generated proposal; `phase3_consistency.py` compares every proposal English value with the issued quote configuration, every spec-sheet row with the configuration, and every Chinese value with the rendered spec PDF. `phase3_proposal.py` checks all three merged PDF parts and revision footer. |
| G4 refuses MI without complete destination data | PASS | `loadManufacturingDocuments` and `issueWorkOrder` check the profile server-side; `phase3_mi.py` removes colour codes in the disposable database and observes a G4 refusal before restoring them. |
| G11 refuses MI when a custom change image has no 版次 | PASS | `loadManufacturingDocuments` and `issueWorkOrder` check unbound images server-side; `phase3_mi.py` inserts an unbound test image, observes G11 refusal, then uploads a bound PNG and confirms its filename in MI/spec PDFs. |
| Traditional Chinese renders in PDFs | PASS | `cjk_pdf_check.py` extracts ordered terms, ROC dates, and the named embedded Noto Sans CJK TC font from PI/MI/spec; it rasterizes page 1 and confirms header ink. All three page renders were visually inspected. `npm run test -- documents` passed 2 template assertions. |
| Printed PI and MI accepted by 生管 | **FAIL / pending external review** | Print-ready worked examples are in `print-samples/`. No physical acceptance has been reported. |

`phase2.py` also confirms that changing quotation terms removes a generated proposal
and G1 refuses issue until it is regenerated. Specification revision 2 was issued
after a reviewed manual change; `phase3_revision.py`
confirmed its new value and byte-for-byte preservation of the revision 1 PDF. Paper
distribution and acknowledgement are recorded per specification revision. `phase3_pi.py`
confirmed G3 and G9 refusals and signed release. `npm test` passed 27 tests,
`npm run lint` passed, and `npm run build` passed.

The example model PDF is explicitly marked as unapproved literature. Only KMC-637AS has
source base specifications and a model PDF in the supplied examples. Real model assets,
historical master data, and production deployment checks remain outstanding. The
2026-10-02 npm audit reports 20 advisories across all dependencies (8 moderate,
11 high, 1 critical) and 12 in runtime dependencies (2 moderate, 10 high).
The available fixes require major updates to Next.js, Puppeteer, Drizzle and
the test/build tools. These updates and the subsequent browser/PDF regression run
are a release prerequisite.

### 2026-10-02 operational follow-up

The machine-model editor now accepts a source-approved PDF and bilingual base values.
Migration `0008_curly_chamber.sql` adds nullable `proposal_asset_name` and
`proposal_asset_base64` columns to `machine_models`; it does not change or delete
existing rows. Uploaded files are validated as PDFs up to 10 MB, stored durably, and
retrieved through an authenticated route. Changing an asset or base value invalidates
draft proposals for that model; already issued merged PDFs remain frozen.
`phase3_model_assets.py` passed upload, damaged-file refusal, unauthenticated-download
refusal, base-value editing, and regeneration. Both example databases migrated and
seeded successfully; the main database smoke check, 27 unit tests, lint, and build
passed. The physical 生管 print acceptance remains pending.

## Scope audit

No Phase 4 production counter, FAT, shipment, case, dashboard, aftermarket, or scorecard
workflow was built ahead. The Phase 3 work adds configuration, generated documents,
orders/PO checks, specification revisions, attachment manifest, and paper circulation.

## Anti-requirements audit

No ERP connector, compatibility rules engine, customer portal, machine translation,
total-only discount, percentage-complete field, mobile app, or forwarder integration
was added. Excluded quoted options remain visible on the technical proposal without
entering its total.

## Pending decisions audit

The existing `DECISION-PENDING` markers for D4, D5, D8, D12, D19, and the lost-reason
vocabulary remain in source. No pending business decision was silently marked resolved.

## Gate audit through G13

| Gate | Server-side location | Refusal test | Verdict |
|---|---|---|---|
| G1 | `issueQuotation` | `phase2.py` | PASS |
| G2 | `approveQuotationDiscount`, `issueQuotation` | `phase2.py` | PASS |
| G3 | `markDealWon` | `phase3_pi.py` | PASS |
| G4 | `loadManufacturingDocuments`, `issueWorkOrder` | `phase3_mi.py` | PASS |
| G5 | Phase 4b booking | Not built | Future phase |
| G6 | Phase 4 machine acceptance | Not built | Future phase |
| G7 | Phase 6 commission | Not built | Future phase |
| G8 | Phase 6 parts quotation | Not built | Future phase |
| G9 | `releaseDocument` | `phase3_pi.py` | PASS |
| G10 | Phase 4 site visit | Not built | Future phase |
| G11 | `loadManufacturingDocuments`, `issueWorkOrder` | `phase3_mi.py` | PASS |
| G12 | price-book publication service | `phase2.py` | PASS |
| G13 | Phase 6 cases | Not built | Future phase |
