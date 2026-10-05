# 07 · Build plan

Eight phases. Each ends with working software and stated acceptance criteria. **Do not
start a phase before the previous one's criteria pass.** Building ahead is a defect.

---

## Effort

Person-days, assuming Claude Code. Without it, roughly double phases 1, 2, 4, 5, 6, 7.

| Phase | Low | High | Driver of the range |
|---|---|---|---|
| 0 · Historical analysis | 5 | 8 | How clean the ERP export is |
| 1 · Foundation | 12 | 18 | 31 tables, auth, roles, i18n, seed |
| 2 · Quotation engine + price book | 22 | 31 | Revisions, version locking, import flow, first PDF |
| 3 · Chinese documents | 25 | 35 | **Highest risk.** Four bilingual templates plus print rounds with 生管 |
| 4 · Production and delivery | 16 | 22 | Counter, escalation, FAT, condition photos |
| 4b · Logistics and shipment | 20 | 28 | Nine-stage phase E, booking states, 出貨單 and 出貨通知, logistics role |
| 4c · Claims and disputes | 25 | 33 | Claim register, positions, briefing pack, report G2. **A minimum version is 8–10 days** |
| 5 · Wave-1 dashboards | 14 | 18 | Filter component and query layer, then 5 reports |
| 6 · Aftermarket, cases and commercial | 43 | 60 | Parts **incl. identification and pricing round-trips**, cases module 25–35, commission, leakage |
| 7 · Remaining reports and scorecards | 18 | 24 | ~2 days each once the framework exists |
| Testing, hardening, deployment | 20 | 28 | ~25% of everything. Not a phase |
| Data preparation | 8 | 12 | Item master 品名, price book, agents, open orders |
| Training, documentation, live support | 8 | 12 | First months of real use generate rework |
| **Total** | **236** | **329** | |

**Elapsed time.** At 2 days/week: **29–41 months**. At 3 days/week: 19–27 months. Full time:
12–17 months.

Do not promise twelve months for the complete system. The phased design is the protection:
every phase produces something that works alone, so a programme that stops early still
leaves value behind.

---

## Phase 0 · Historical analysis
**No software.** Export 3–5 years of orders from the ERP; analyse in a spreadsheet or
Power BI. Revenue by agent, region and model; concentration; discount patterns; delivery
performance where the dates exist.

**Accept when:** one finding worth having in its own right has been delivered to
management. Something of the shape *"the top five agents produce 68% of revenue while
twelve agents have not ordered in two years but still hold territory."*

This earns the rest of the programme rather than asking for it up front.

---

## Phase 1 · Foundation
Schema for `02-data-model.md` §4.1–4.3, migrations, seed, Auth.js with roles, layout
shell, next-intl scaffolding with `data/i18n/zh-Hant.json` loaded.

**Accept when:** a user can log in, switch locale, and CRUD partners, items, machine
models and price book versions. Chinese item names display correctly in the browser.

---

## Phase 2 · Quotation engine and price book
Deals, quotations, revisions, lines, design review gate, discount approval, price book
version locking, the six-monthly import flow (`11-price-book.md`), English quotation PDF.

**Accept when:**
- A deal can be quoted at r1 and revised to r3 with a **line-level** discount
- G1 and G2 both refuse a premature final quotation, server-side
- The generated PDF matches the layout of the seeded `Q-2026-0147` quotation
- A price list can be uploaded, validated with row-numbered errors, previewed as a diff,
  and published; G12 refuses publication with errors outstanding

---

## Phase 3 · Configuration and Chinese documents
`deal_spec_values`, compliance profiles, technical proposal (three-part merge), PI 訂單,
MI 製令單, 製造規格表 with 版次, distribution tracking, attachment manifest.

**Accept when:**
- A final quotation produces a technical proposal and a 製造規格表 whose values match
- G4 refuses the MI without complete destination data
- G11 refuses the MI when a custom change image is not bound to a 版次
- Snapshot tests confirm Chinese renders — run `/cjk-pdf-test`
- **A printed PI and MI have been taken to 生管 and accepted.** This is a real gate, not a
  code one, and it has calendar latency. Budget five rounds

---

## Phase 4 · Production and delivery
Progress reviews and the monthly counter, slip and escalation, FAT records and generated
checklist, shipments, machines, site visits, condition photographs.

**Accept when:**
- Issuing an MI generates monthly review rows through to the contractual date + 6 months
- Entering a moved expected date raises escalation at 30 and 60 days
- Slip is attributed to the stage reported that month (`07b-file-review.png`)
- An unfilled review past its due date surfaces as an exception
- G10 refuses to close a site visit without a photo set

> **Consider moving the cases module here from phase 6** if after-sales translation turns
> out to consume several hours of the team's week. Better return per day than two or three
> of the specified reports.

---

## Phase 4b · Logistics and shipment
Nine-stage phase E (`12-logistics.md`), booking request and confirmation states with
attempt counting, 出貨通知 and 出貨單, the `logistics` role and its home queue.

**Accept when:**
- A machine moves through E0 to E8 with each timestamp recorded separately
- G14 refuses to mark space confirmed without a booking reference, and a second attempt
  increments rather than overwrites
- G15 refuses to issue a shipping notice before space is confirmed
- A printed 出貨單 has been shown to the supervisor and accepted
- Booking delay appears on report D2 with its own cause code

---

## Phase 4c · Claims and disputes
Claim register with lines, events and three amounts; links to cases, machines and the
leakage register; the visit briefing pack (`13-claims-disputes.md`).

**Accept when:**
- The six claims from the real German register can be entered and reproduced exactly
- G19 refuses to settle a claim without a method and an amount
- G20 creates a leakage entry automatically when responsibility is Kao Ming's
- G21 keeps a credit-note settlement open until it is applied to an order
- A briefing pack generates for one agent, prints on one or two pages, and flags any open
  claim with no stated position

> **Build the minimum version first — 8 to 10 days.** Claim object, lines, positions,
> events and the briefing pack generator, with no reports, no automatic leakage flow and no
> credit-note mechanism. It makes an existing hand-compiled spreadsheet a by-product, and
> it is the only deliverable in the programme with a named upcoming trigger: a customer
> visit.

---

## Phase 5 · Wave-1 dashboards
Shared filter component and query layer, then D1, A2, A3, B1, F1.

**Accept when:** D1 is usable as a daily working screen, every figure carries its measure
label, and B1 ranks on net revenue after commission.

---

## Phase 6 · Aftermarket, cases and commercial
Parts requests with stock check and warranty determination, parts quotations with
supervisor approval, **the after-sales case module** (`10-aftersales-cases.md`), commission
accrual, leakage entries, nightly penalty exposure job.

**Accept when:**
- An `undeterminable` warranty case is countable and surfaced
- Commission accrues at order confirmation, not at claim
- Penalty exposure recalculates nightly from slip × contract rate, capped
- A case can be opened, translated in both directions, moved through its states and
  closed; G13 refuses closure with untranslated messages
- Time-in-state is queryable from `case_state_log`

---

## Phase 7 · Remaining reports and scorecards
B2, B3, C1, C2, D2, D3, E1, E2, E3, G1 and the quarterly scorecard snapshot job.

**Accept when:** D2 renders a slip curve per order with the escalation thresholds, G1
renders the leakage waterfall from list price to realised, and no scorecard is published
for an agent with fewer than four quarters of data.

Then: ask the `spec-auditor` subagent to audit the whole implementation against `docs/`
and report divergence.

---

## What fits in a twelve-month contract at two days a week

Roughly 88 working days. That buys **phases 0 through 3, plus data preparation and its
testing share** — the team stops retyping quotations and the factory documents generate in
Traditional Chinese.

It does not buy the dashboards, delay tracking, leakage register, cases or scorecards.
Say so plainly rather than discovering it in month ten.
