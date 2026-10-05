# 05 · Reports and dashboards

Eighteen reports in six groups. Wireframe for each in `reference/screens/`.

---

## The framing that must appear on every revenue view

Bookings, revenue and cash are three different numbers that place the same order in three
different months, because the cycle runs ten to twelve months.

| Measure | Counted at |
|---|---|
| Bookings | PO received — B1 |
| Revenue | Shipment — E4 |
| Cash | Each payment received |
| Order book | Open, unshipped orders |

**Label the measure on every tile.** A month with strong bookings and weak revenue is a
good month, not a bad one.

## The shared filter set

Every report uses the same filters, so a filter carries over when moving between them:

**period** · **date basis** (order / shipment / acceptance / payment) · **agent** ·
**country → region** · **machine model** · **measure** · **currency**

Date basis is the one everyone forgets. Put it in the page title so a screenshot pasted
into an email is unambiguous. `regions` is defined once in `03-business-rules.md` — never
define a local grouping.

---

## The set

| ID | Report | Wave | Wireframe |
|---|---|---|---|
| A1 | Executive overview — 6 tiles, no more | 1 | `R-a1-executive.png` |
| A2 | Revenue and orders | 1 | `12-report-revenue.png` |
| A3 | Cash and payment milestones | 1 | `R-a3-cash.png` |
| B1 | Agent league table — **ranked on net revenue after commission** | 1 | `R-b1-league.png` |
| B2 | Agent scorecard and tiers | 3 | `R-b2-scorecard.png` |
| B3 | Coverage and white space | 3 | `R-b3-coverage.png` |
| B4 | Commission and channel economics | 2 | `R-b4-commission.png` |
| C1 | Pipeline and quotations | 2 | `R-c1-pipeline.png` |
| C2 | Mix, options and discounting | 2 | `R-c2-mix.png` |
| D1 | Order book and status | 1 | `11-report-by-stage.png` |
| D2 | Delays and slip | 2 | `13-report-delays.png` |
| D3 | Forecast and capacity | 2 | `R-d3-capacity.png` |
| E1 | Warranty and FOC leakage | 2 | `R-e1-warranty.png` |
| E2 | Spare parts and installed base | 2 | `R-e2-parts.png` |
| E3 | After-sales cases | 2 | none — see `10-aftersales-cases.md` §5 |
| F1 | Document throughput | 1 | `R-f1-documents.png` |
| G1 | Margin leakage register | 2 | `R-g1-leakage.png` |
| G2 | Claims and disputes | 2 | none — see `13-claims-disputes.md` §7 |

**Waves.** W1 runs on ERP history and the order tracker. W2 needs the progress counter,
quotation revisions and warranty determinations to accumulate. W3 needs four quarters of
scorecard snapshots.

---

## Two tiles added from the logistics flow

**D2 · booking window**, alongside production slip. Booking takes 2–3 weeks and can only
start once the final payment is received, so the useful tile is *machines completing soon
with payment outstanding* — booking cannot start in time and the delivery date is already
lost. Space itself is almost never refused; the risk is the calendar, not the vessel.

**A3 · payment due before booking**, the same alert from the finance side, beside deposits
outstanding. It is the same class of problem at the other end of the order.

**E2 · parts turnaround split** — three tiles: waiting for identification, waiting for a
price, preparing the quotation. Enquiries arrive daily and nobody can currently estimate
the volume, so the first real count is itself a finding. The expectation is that the two
waits dominate and that writing the quotation takes minutes.

**E2 · alternatives suggested and rejected** — how often Kao Ming does not have the part the
customer asked for, and how often the substitute is refused. An inventory and product
signal nobody has.

## Build D1 first

If the sales team does not open it every morning, nothing downstream is populated and
every other report is empty. It is the only report in phase 5 that must be good rather
than merely correct.

---

## Two rules that prevent the common failures

**Never rank on raw revenue.** Normalise to a percentile within region and market-size
band, and always use net revenue after commission. A Vietnamese agent at US$800k may be
outperforming a German agent at US$3M.

**Flag small N.** Any metric built on fewer than five data points renders with a
low-confidence marker. Three deals is not a win rate, and a scorecard built on one thin
quarter will be disproved.

---

## Query layer

Queries live in `src/queries/<report-id>.ts`, are typed, and are tested against the seed
data with known expected values. No client-side data fetching for the initial render:
Server Component page, Client Component filter bar writing to `searchParams`.
