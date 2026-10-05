---
name: price-book-import
description: Build or change the six-monthly price list import — upload, validate, diff preview, publish. Use for any work on price book versions or the import flow.
allowed-tools: Read Edit Write Grep Glob Bash(npm run test*)
---

Specification: @docs/11-price-book.md · Template: @data/import-templates/price-list.csv

## The four steps

1. **Upload** — CSV or XLSX, columns matched by header name not position.
2. **Validate** — nothing is written until it passes. Report **every** problem at once with
   row numbers, not just the first. Codes: `UNKNOWN_ITEM`, `DUPLICATE_ITEM`,
   `MISSING_PRICE`, `BAD_NUMBER`, `NON_POSITIVE`, `UNKNOWN_CATEGORY`, `MISSING_品名`.
3. **Diff preview** — the safeguard. Show added / removed / changed counts, the ten largest
   movements by percentage with old and new prices, the average movement, and any item that
   disappeared while appearing on an open quotation. Require an explicit confirmation.
4. **Publish** — new `price_book_versions` row, close the previous `effective_to`, write
   `prices`.

## Rules
- Publishing **never** touches issued quotations. They keep their locked version.
- No overlaps and no gaps between versions.
- Gate G12 refuses publication with validation errors outstanding.
- Restricted to `admin` and `manager`.
- Every import is retained in `price_book_imports` with errors and diff, published or not.
- A mid-version correction is a **new short version**, never an edit to a published one.

## Test
Seed two versions, issue a quotation against the first, publish the second, assert the
quotation still prices from the first.
