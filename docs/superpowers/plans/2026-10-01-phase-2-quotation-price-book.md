# Phase 2 · Quotation engine and price book

**Scope:** `docs/07-build-plan.md` Phase 2, `docs/02-data-model.md` §4.4 and §4.13, `docs/03-business-rules.md` G1/G2/G12, and `docs/11-price-book.md`.

## Design decisions

- A quotation revision is an immutable snapshot. Creating r2 copies r1 lines and terms into a new draft. Editing a draft creates replacement lines within that draft; issued and superseded rows are never updated. The issue transition sets the version, issue date, validity, totals, and final status in one transaction.
- Line prices come from a published price book and are copied onto lines. Discounts are stored per line; the totals derive from included lines only. Excluded lines retain the offer price but contribute zero.
- G1 is checked by the server transition: a confirmed design review linked to the deal and a technical proposal row for this exact revision. G2 requires a recorded manager/GM discount approval for discounted revisions. These checks must still refuse a direct action call.
- The import stores the uploaded source, row errors, and diff. Validation reads item/category masters and the previous published list. G12 is checked again at publication, with explicit confirmation and an atomic transaction closing the old version and inserting the new one. Existing issued quotations keep their prior version and prices.
- The English quotation template is rendered from the deal and frozen quotation lines. The PDF footer carries deal number, revision, and issue date.
- D4, D5, and D19 use documented defaults: deposit, 12 months, and ready to ship. Open decisions remain marked.

## Work sequence

1. Add domain schema, enums, migration, seed worked example, and database smoke checks. Read migration SQL before applying.
2. Add quote calculations and server-side transitions with integration tests for revision immutability and G1/G2.
3. Add deal and quotation screens, including line editing, design review, approvals, and revision history.
4. Add CSV/XLSX import parser, all-row validation, diff preview, publish transaction, and G12 tests. Add management UI.
5. Add the quotation HTML/PDF template and browser test against `Q-2026-0147` structure.
6. Run tests, lint, build, browser acceptance, gate check, and Phase 2 review. Do not begin Phase 3 until acceptance passes.

**Deferred dependency:** Real ERP and master exports are unavailable. The user authorized use of supplied worked examples for now.
