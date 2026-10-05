---
name: logistics-shipment
description: Build or change the shipment flow — completion notification, space booking, shipping notice, shipping order — and the extended spare parts identification and pricing steps. Use for any work on shipments, bookings, forwarders, or parts enquiry states.
allowed-tools: Read Edit Write Grep Glob Bash(npm run test*)
---

Specification: @docs/12-logistics.md · Schema: @docs/02-data-model.md §4.15

## The nine stages of phase E

```
E0 完工通知 → E1 final payment → E2 訂艙 requested → E3 space confirmed
→ E4 出貨通知 → E5 export documents → E6 出貨單 printed → E7 shipped → E8 arrived
```

**Payment comes before booking.** Kao Ming does not commit to freight until it has been
paid. G5 gates E2, not E7.

## Invariants

1. **E0 is a handoff, not a date.** `work_orders.actual_finish` is production control
   recording 完工日期. `shipments.completion_notified_at` is manufacturing telling
   logistics the machine is ready. The gap between them is measurable and is not zero.
2. **Booking is slow, not risky.** Space is almost never refused, but booking takes
   **2–3 weeks**. Treat it as a planned lead time, not a failure mode. `booking_due_by`
   is generated as contractual delivery − 21 days, and the useful alert is:
   *machine completes soon, payment not received, booking cannot start in time.*
3. **G15: never issue a 出貨通知 before space is confirmed.** A shipping notice with no
   vessel is worse than no notice.
4. **The incoterm derives the forwarder.** FOB → the customer appoints. CIF → Kao Ming
   chooses, and Kao Ming carries freight and insurance. Never let a user set
   `forwarder_nominated_by` directly.
5. Booking delay carries its own cause code on report D2. A machine waiting three weeks
   for a vessel and one waiting three weeks in assembly look identical to the customer and
   need different fixes.
6. **No forwarder integration.** Space is booked by email and phone. Record the outcome.

## Spare parts — two round-trips before a price exists

```
enquiry → 售後 identifies the part → stock check → 採購/生管 prices it
        → quotation drafted → supervisor approval → terms → PDF
```

- G17 refuses a quotation from an unidentified or unpriced part.
- 售後 supplies a part number **or suggests an alternative** when the part is unavailable.
  States: `alternative_suggested`, `alternative_accepted`, `alternative_rejected`. A
  rejection is a lost sale with a recordable reason — surface it on report E2.
- G18: the approver must not be the preparer. When the supervisor prepares, approval routes
  to the department manager.
- Time each wait separately: `identification_requested_at` / `_received_at` and
  `pricing_requested_at` / `_received_at`. These feed the three turnaround tiles on
  report E2, and the expectation is that the two waits dominate.
- A parts enquiry usually arrives as a `part_failure` case. Link, do not duplicate —
  `linked_case_id`.
- `unidentifiable` is a real terminal state. See DECISION-PENDING D14 for what precedes it.

## Documents
`出貨通知` shipping notice — English, to the agent and customer.
`出貨單` shipping order — Chinese, internal, travels with the goods, sign-off blocks as on
every other internal form. Use `/new-document-type` and then `/cjk-pdf-test`.

## Role
`logistics` is both doer and approver: she runs the parts enquiry **and** approves
quotations prepared by international sales. G18 keeps that a real control by routing
approval to the department manager whenever she is the preparer.
