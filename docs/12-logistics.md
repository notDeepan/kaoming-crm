# 12 · Logistics and shipment

Added after a description of the logistics supervisor's daily work. She sits between
manufacturing and the forwarder, and she also runs the spare parts enquiry flow end to
end. Two parts of the specification were wrong before this: phase E was too thin, and the
parts flow was missing two internal round-trips.

---

## 1. The role

`logistics` — a new role, and an unusual one. She is both doer and approver:

| Does | Approves |
|---|---|
| Receives parts enquiries from customers and agents | Parts quotations before release |
| Creates the PI 訂單 in the system and notifies 生管 | |
| Books space with the forwarder | |
| Issues the 出貨通知 shipping notice | |
| Prints the 出貨單 shipping order and ships | |

> **RESOLVED · D13, with a caveat.** Quotations are reviewed by the supervisor. The answer
> did not distinguish the case where she both prepares and reviews, and her own workflow
> includes preparing quotations directly. Resolved as: **the approver must not be the
> preparer.** When the supervisor prepares, approval routes to the department manager.
> Confirm this in one sentence with her.

### Permissions

| Area | Access |
|---|---|
| Parts enquiries, quotations | Full, including approval |
| Deals | Read; create PI at B3 |
| Shipments | Full |
| Documents | Shipping-related: 出貨單, 出貨通知, commercial invoice, packing list, CoO |
| Machines, installed base | Read |
| Agent scorecards, leakage, commission | **No access** |

---

## 2. Spare parts — the corrected flow

The previous version went straight from enquiry to stock check. The real sequence has two
waits on other departments before a price exists.

```
enquiry received
  → part identification        ← 售後 after-sales confirms the part number
  → stock check                 ← warehouse
  → pricing request             ← 採購 procurement or 生管 production control
  → quotation drafted
  → supervisor approval         ← gate G8
  → terms completed (T/T, 3–5 days or per procurement lead time)
  → PDF issued to the agent
```

### Why the two new steps matter

**Part identification.** A customer reports a symptom or sends a photograph, not a part
number. Someone in 售後 has to identify it. This is the same bilingual relay as the case
module — a `part_failure` case and a parts enquiry are usually the same event seen twice,
and they should be linked, not duplicated.

**Pricing request.** Not every part carries a standing price. Where it does not, 採購 or
生管 must quote it before anything can go to the customer.

### New states on `parts_requests`

Added to the `parts_status` enum, before `stock_checked`:

`awaiting_identification` · `identified` · `awaiting_pricing` · `priced`

**RESOLVED · D14.** 售後 must supply a part number, or — where the described part is no
longer available — **suggest an alternative**. So `unidentifiable` is not a dead end; there
is a substitution path, and the customer may accept or reject the alternative.

Additional states: `alternative_suggested` · `alternative_accepted` ·
`alternative_rejected`. A rejected alternative is a lost parts sale with a recordable
reason, and *how often we do not have what the customer asked for* is an inventory and
product signal nobody currently has. Add it to report E2.

### New columns on `parts_requests`

| Column | Type | Notes |
|---|---|---|
| identification_requested_at | timestamptz | sent to 售後 |
| identification_received_at | timestamptz | |
| identified_by | text | who in 售後 |
| pricing_requested_at | timestamptz | sent to 採購 / 生管 |
| pricing_received_at | timestamptz | |
| priced_by | text | |
| price_source | `price_source` | `price_book`, `procurement_quote`, `production_quote` |
| linked_case_id | uuid → cases | when the enquiry arrived as a case |

### What this measures, for the first time

Turnaround split three ways: **waiting for identification**, **waiting for a price**,
**preparing the quotation**. The expectation is that the first two dominate and the third
is minutes. Nobody currently knows, and the split decides where any improvement effort
should go. Add these three tiles to report **E2**.

---

## 3. Machine shipment — phase E rebuilt

Previously four stages. Nine, as actually worked.

| Stage | Chinese | Trigger | Owner |
|---|---|---|---|
| E0 · Completion notification | 完工通知 | 製造 notifies logistics the machine is finished | Manufacturing → logistics |
| E1 · Final payment received | | Balance settled per terms. **Blocks booking** | Finance |
| E2 · Space booking requested | 訂艙 | Forwarder contacted. **Takes 2–3 weeks** | Logistics |
| E3 · Space confirmed | | Space obtained. Rarely refused, but never immediate | Forwarder |
| E4 · Shipping notice issued | 出貨通知 | Space confirmed | Logistics |
| E5 · Export documents prepared | | Commercial invoice, packing list, certificate of origin | Logistics |
| E6 · Shipping order printed | 出貨單 | Created at shipment, not at order entry | Logistics |
| E7 · Shipped | | Collected | Forwarder |
| E8 · Arrived | | Destination port | Forwarder |

**RESOLVED · D15** — booking is arranged only after the final payment is received, and the
shipping notice goes out only after space is confirmed. Payment now gates **booking**,
not shipment.

**RESOLVED · D16** — the 出貨單 is created at shipment (E6), not at order entry.

> **DECISION-PENDING: D15** — does the balance payment come before or after the shipping
> notice? The notice may be what prompts the customer to settle. Default: E4 after E3, and
> gate G5 still blocks E7 until payment is received.

### E0 is a handoff, not a date

`work_orders.actual_finish` (完工日期) already exists, but that is production control
recording a date. E0 is a separate event: manufacturing telling logistics the machine is
ready to ship. The gap between the two is measurable and probably not zero.

### Incoterms decide who appoints the forwarder

| Term | Forwarder | Freight cost | Insurance | Risk transfers |
|---|---|---|---|---|
| FOB | Customer or agent appoints | Customer | Customer | At the Taiwan port |
| CIF | **Kao Ming chooses** | **Kao Ming** | **Kao Ming** | At the Taiwan port; cost carried to destination |

`incoterm` is a field on the quotation, carried to the order and the shipment. It already
appears on paper quotations as *Place of Delivery: FOB TAIWAN*. It **derives**
`forwarder_nominated_by` rather than being entered separately.

> **DECISION-PENDING: D18 — freight rate movement on CIF orders.** Under CIF the freight is
> priced into a quotation issued ten to twelve months before the space is booked. Ocean
> freight for heavy machinery moves considerably over that span, and the difference lands
> in whatever account pays the forwarder rather than against the order. Added as leakage
> category `freight_rate_movement` in group E. Whether it is material depends on what share
> of orders are CIF — record the split before deciding how hard to chase it.

### Booking is slow, not risky — this inverts the design

Space is almost never unavailable, but booking takes **two to three weeks**. It is a
planned lead time to schedule around, not a risk to monitor.

Combined with E1, that produces a forward-looking alert nobody currently has:

> Machine completes in four weeks. Final payment not received. Booking cannot start in
> time to hold the delivery date.

**Final payment must arrive roughly three to four weeks before the contractual delivery
date, not on it.** Surface this on the logistics home queue, on the sales home screen, and
on report A3 beside deposits outstanding — it is the same class of problem at the other end
of the order.

`booking_attempts` is retained for the rare refusal but is not the story. Do not build
attempt-handling UI around it.

New columns on `shipments`:

| Column | Type | Notes |
|---|---|---|
| completion_notified_at | timestamptz | E0 |
| booking_requested_at | timestamptz | E1 |
| booking_confirmed_at | timestamptz | E2. Null while waiting |
| booking_attempts | integer | how many times space was sought before it was obtained |
| booking_reference | text | forwarder's reference |
| vessel_or_flight | text | |
| etd, eta | date | |
| shipping_notice_sent_at | timestamptz | E3 |
| shipping_order_printed_at | timestamptz | E6 |
| forwarder_nominated_by | `forwarder_nominator` | Derived from the incoterm: FOB → `customer`, CIF → `kao_ming` |
| incoterm | `incoterm` | Carried from the quotation |
| freight_cost | numeric(14,2) | CIF only. Compare against what was priced in |
| booking_due_by | date | Derived: contractual delivery − 21 days. Drives the alert |

---

## 4. New documents

| Document | Chinese | Language | To | Generated from |
|---|---|---|---|---|
| Shipping notice | 出貨通知 | English | Agent and customer | Shipment: vessel, ETD, ETA, package details |
| Shipping order | 出貨單 | Chinese | Internal, travels with the goods | Order + shipment |

Both follow the rules in `04-documents.md`. The 出貨單 is a Chinese printed form and must
carry the same sign-off blocks as the other internal documents — take a printed copy to
the supervisor and to the warehouse before building anything on top of it.

Two inbound attachments to store against the shipment: the forwarder's booking
confirmation, and the bill of lading.

---

## 5. New gates

| ID | Transition | Blocked until |
|---|---|---|
| G14 | E1 → E2 booking request to confirmed | A booking reference is recorded. Attempts are counted, not overwritten |
| G15 | E3 shipping notice | Space is confirmed. Never notify a customer of a shipment with no vessel |
| G16 | E6 shipping order printed | Export documents complete and final payment received (existing G5) |
| G17 | Parts quotation drafted | Part identified **and** priced. No quotation from an unidentified part |

---

## 6. Screens

No wireframes were drawn for these. Follow `06-screens.md` conventions.

**Logistics home** — a queue rather than a dashboard. Machines awaiting booking, bookings
awaiting confirmation, shipments awaiting documents, parts enquiries awaiting
identification, parts enquiries awaiting a price. Same design principle as the sales home
screen: everything on it is something a person has to do.

**Shipment detail** — the nine stages as a progress list, booking panel with attempt
history, package dimensions and weight, document list with print states.

**Parts enquiry** — extend the existing `14-parts-request.png` with the identification and
pricing panels above the stock check, each showing who was asked and how long it has been
waiting.

---

## 7. Effort

| Item | Days |
|---|---|
| Parts identification and pricing states, timers, case linkage | 5–7 |
| Shipment module: E0–E8, booking attempts, waiting states | 10–14 |
| 出貨單 and 出貨通知 documents | 5–7 |
| Logistics role, permissions, home queue, shipment screens | 5–7 |
| Booking delay on report D2, turnaround split on E2 | 3–4 |
| Testing share | 6–8 |
| **Gross** | **34–47** |
| Less what phase 4 already budgeted for shipments | −9 to −12 |
| **Net addition** | **25–35** |

Placed in **phase 4** for the shipment module — it is delivery, and it belongs with the
production counter — and **phase 6** for the parts flow changes.

Revised programme total: **211–296 person-days**, which at two days a week is **26 to 37
months**.

---

## 8. Questions for the supervisor

1. Is the 出貨單 created when the order is entered, or at shipment time? (D16)
2. Does the balance payment arrive before or after the shipping notice — does the notice
   prompt it? (D15)
3. How long does space booking usually take, and how often is space unavailable?
4. When 售後 cannot identify a part from the customer's description, what happens? (D14)
5. ~~How many parts enquiries a month?~~ **Answered: daily, no estimate available.** The
   system will produce the first real count, which is itself a finding.
6. Does she approve parts quotations she prepared herself? (D13)
7. Is the forwarder always nominated by the customer or agent, or sometimes chosen by
   Kao Ming?
8. Does she handle anything besides machines and spare parts — samples, returns, items
   sent back for repair?
