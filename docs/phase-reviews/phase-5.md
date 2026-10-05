# Phase 5 review — 2026-10-04

**Result: TECHNICAL PASS on examples; not a production data acceptance.** D1, A2,
A3, B1 and F1 are available from Reports with shared filters and server-rendered
query modules in `src/queries/`.

| Acceptance criterion | Result | Evidence |
|---|---|---|
| D1 usable as a daily screen | PASS on examples | Open unshipped queue is always current, sorted by contractual date, with order, production and delivery links. The browser check validated one open order for USD 827,850. |
| Every figure has a measure label | PASS on reviewed screens | D1 and A2 screen captures were visually inspected; tiles and tables label count, bookings, shipped revenue, known cash and order book. |
| B1 ranks on net revenue after commission | PASS on examples and unit cases | Shipped orders use the applicable order-date contract rate/base. Markup agents accrue zero. Uncomputable commission terms are excluded and called out; unit cases cover three bases and unknown terms. |
| Shared filters | PASS | Browser check carried country and region filters between all five report tabs. |
| Cash amounts | PASS with historical limitation | New receipts store exact amounts. A browser check recorded a USD 206,400 deposit and found it in A2/A3 without regressing project stage. Older timestamp-only payments remain explicitly marked as missing amounts. |

`tests/e2e/phase5.py` passed against the disposable example database. Unit tests,
TypeScript, lint and the production build passed. The screenshots in `.local/` are
local review artifacts.

**Remaining before real management use:** import and reconcile historical ERP
orders, payments, contract terms and market-size bands. The agent ranking shows
regional percentiles and a low-N warning, but cannot normalize by market-size
band until that source attribute is provided. Date-basis filtering selects the
order cohort; bookings, revenue and cash retain their own event dates. The current
query layer loads matching domain rows and aggregates in application memory, so
large historical volumes need indexed SQL aggregation and a performance review.
