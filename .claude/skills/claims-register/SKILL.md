---
name: claims-register
description: Build or change the commercial claims and disputes register, and the visit briefing pack. Use for any work on claims, 請款, settlements, credit notes, or preparing for a customer visit.
allowed-tools: Read Edit Write Grep Glob Bash(npm run test*)
---

Specification: @docs/13-claims-disputes.md · Schema: @docs/02-data-model.md §4.16

## A claim is not a case

A **case** means the machine has a problem and closes when the machine works. A **claim**
means the customer wants money and closes when the amount is agreed. Link them, never
merge them.

## Invariants

1. **Three amounts, not one.** `claimed_amount`, `offered_amount`, `settled_amount`, each
   with its own currency. The real register mixes EUR and USD. `base_amount_usd` exists
   for aggregation only and carries its rate and rate date.
2. **Positions are stated per line.** `claim_lines` mirror 請款項目, each with an `accepted`
   flag. Kao Ming's real positions split a claim into drawing errors, 說明變更 and
   engineering change — the total is not where the argument happens.
3. **G20: a settled claim with `responsibility = kao_ming` creates a leakage entry
   automatically.** Never let the same concession be recorded twice.
4. **G21: a `credit_note` settlement sets `pending_credit`** and stays open until
   `applied_to_order_id` is populated. A credit may wait a year for the agent's next order;
   untracked, it silently reduces a future order's margin.
5. `kao_ming_position` is the field that matters most. One sentence of it goes on the
   briefing pack.
6. Ship date variance is **derived** from the order and shipment, never re-entered.

## The briefing pack

The reason this module exists. Printable, per agent, bilingual. Per claim: machine and
serial, ship-date variance, claim and reason, the three amounts, **our position in one
sentence**, status, last contact, next action.

It **flags** open claims with no stated position rather than refusing to generate — that
gap is exactly what the traveller needs to know before the meeting.

## Build the minimum first

Claim object, lines, events, positions and the briefing pack: 8–10 days. Defer reports,
the automatic leakage flow and the credit-note mechanism. This replaces a spreadsheet
compiled by hand before customer visits, and it is the only deliverable with a named
upcoming trigger.
