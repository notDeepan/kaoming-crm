# 13 · Commercial claims and disputes

Added after a real claim register maintained by the senior international sales engineer,
compiled by hand in Excel ahead of a customer visit to Germany. The system's job is to make
that sheet a by-product rather than a manual compilation.

---

## 1. What the register tracks

Nine columns per claim, taken from the real sheet:

| Column | Meaning |
|---|---|
| 機型 & 機號 | Machine model and serial |
| 原訂出貨日期 / 實際出貨日期 | Scheduled and actual ship dates — often the root cause |
| 收到請款日期 | Date the claim was received, with the email subject line for traceability |
| 問題內容 | What went wrong |
| 請款金額 (EUR) | Amount claimed, with currency. **EUR and USD both appear** |
| 請款項目 | What the money is for, itemised |
| 高明提出的處理方案 | **Kao Ming's stated position** |
| 最終處理結果 | Final outcome |
| 備註 | Attachment reference (附件 1–6) |

Six claims across four machines and two agents, with several claims per machine.

---

## 2. A claim is not a case

| | Case (`10-aftersales-cases.md`) | Claim |
|---|---|---|
| Means | The machine has a problem | The customer wants money |
| Closes when | The machine works | The amount is agreed |
| Stakeholders | 售後, engineering | Finance, department manager, GM |
| Output | A repair, a part, a visit | A settlement, a credit note, a rejection |

They link — a case often becomes a claim — but they are separate objects with separate
lifecycles. **The claim is the bridge between the case module and the leakage register**:
a settled claim attributed to Kao Ming *is* a leakage entry and must flow there
automatically rather than being recorded twice.

---

## 3. What the real data shows

**Late shipment is the common thread.** Three of the four machines shipped months late —
one 5.5 months. Two of the six claims are directly about delay, including a freight
difference caused by a missed sailing. The monthly progress counter in phase 4 is upstream
prevention for exactly these.

**One claim is the configuration gap, realised.** A Twin Control System was supplied
without the programming capability the customer had ordered, and they refused it. That is
precisely the failure a configuration-specific technical proposal exists to prevent, and it
cost a control panel rebuild plus €1,000 goodwill.

**Settlement is not always cash.** One €7,500 settlement was agreed as a **credit on a
future order**. A claim can therefore reduce the margin on an order that does not exist
yet. Without a pending-credit mechanism the concession disappears from the books.

**Responsibility is contested and worth recording.** On the freight claim Kao Ming checked
the LC, 訂艙 and 結關 records, established the sailing change was the forwarder's, and
rejected the claim on that evidence. That reasoning is more valuable than the number.

---

## 4. The claim object

Schema in `02-data-model.md` §4.16.

### Categories

`late_delivery` · `spec_mismatch` · `documentation_error` · `installation_labour` ·
`freight_difference` · `design_defect` · `performance_shortfall` · `other`

### Status

```
received → under_review → position_stated → negotiating
         → agreed | rejected → settled → closed
```

### Three amounts, not one

| Field | Meaning |
|---|---|
| `claimed_amount` | What they asked for |
| `offered_amount` | What Kao Ming offered |
| `settled_amount` | What was actually agreed |

All three carry their own currency — the real register mixes EUR and USD. Store a
`base_amount` in USD with the rate and rate date, for aggregation only.

### Settlement method

`cash` · `credit_note` · `free_goods` · `cost_share` · `rejected` · `none`

`cost_share` carries a percentage. `credit_note` creates a **pending credit** against the
agent, which attaches to their next order and reduces its margin. Surface pending credits
on the agent record and on report G1 — otherwise a concession granted this year silently
reduces next year's margin with no trace.

### Responsibility

`kao_ming` · `agent` · `customer` · `supplier` · `forwarder` · `disputed`

This drives whether a settlement becomes a leakage entry and whether it is recoverable
from a supplier or forwarder.

### Claim lines

One row per 請款項目, each with its own amount, currency, and an accepted flag. The real
sheet itemises: *①修改控制面板、交換控制台位置及重新配置：€4,400 ②客戶補償：€1,000*.
Kao Ming's positions are often line by line, not on the total — the same argument as
line-level discount on quotations.

### Events

Every position stated, counter-offer, meeting and agreement, with date, summary and
attachment. This is what produces the one-sentence position on the briefing pack, and what
lets someone picking up a claim a year later see how it got where it is.

---

## 5. The briefing pack

**The reason this module exists.** A printable document per agent, carried to a customer
visit, generated rather than compiled.

### Contents

**Header** — agent, country, visit date, prepared by, total open exposure by currency.

**One block per open claim**
- Machine model and serial
- Ship date variance in days (原訂 vs 實際)
- What is claimed and why, in two lines
- Amount claimed / offered / settled
- **Our position, in one sentence**
- Status, what we last said and when
- Next action and who owns it

**Beside it** — that agent's machines in the field, open cases, outstanding payments,
pending credit notes.

### Why the one-sentence position is the point

Walking into a meeting knowing *"we rejected the freight claim because we verified the LC,
訂艙 and 結關 records and established the sailing change was the forwarder's"* is a
completely different thing from knowing there is an open USD 4,000 claim.

The pack **flags** any open claim with no stated position rather than blocking generation —
that gap is itself information the traveller needs.

### Language

Bilingual. The English half is what gets discussed with the agent; the Chinese half is what
gets reviewed internally before the trip. Same rules as `04-documents.md`.

---

## 6. Links to the rest of the system

| Links to | How |
|---|---|
| `machines` | The claim is always about a specific serial |
| `orders`, `shipments` | Ship date variance is already derivable — do not re-enter it |
| `cases` | A case that escalates. Link, do not duplicate |
| `leakage_entries` | A settled claim attributed to Kao Ming creates one automatically — gate G20 |
| `partners` | Claim volume and value feed the relationship block of the scorecard |
| `progress_reviews` | Delay claims should reference the slip that caused them |

---

## 7. Reports

**G2 · Claims and disputes**, group G alongside the leakage register.

| Tile | Answers |
|---|---|
| Open claims, count and exposure by currency | What is outstanding right now |
| By category | Whether these are delay claims, spec claims or design claims — different fixes |
| By responsibility | How much is genuinely ours |
| Claimed vs offered vs settled | Our settlement rate. Are we conceding too readily, or too little? |
| By agent | Two agents produced all six claims in the sample. Is that concentration real? |
| By machine model | A model attracting claims is a product signal |
| Days from receipt to settlement | Claims left open are claims raised again at the next meeting |
| Pending credit notes | Concessions that will land on a future order |
| Root cause traced to slip | How much claim value follows from late shipment |

The last tile is the one that justifies phase 4. If most claim value traces to delay, the
progress counter is not a reporting nicety — it is claim prevention.

---

## 8. Effort, and a minimum version

| Item | Days |
|---|---|
| Claim object, lines, events, three amounts, multi-currency | 8–11 |
| Links to cases, machines, leakage; pending credit mechanism | 4–5 |
| Briefing pack generator, bilingual, printable | 5–7 |
| Claims register and claim detail screens | 4–5 |
| Report G2 | 4–5 |
| Testing share | 5–7 |
| **Full module** | **30–40** |
| Less overlap with the leakage register already budgeted | −5 to −7 |
| **Net addition** | **25–33** |

Programme total becomes **236–329 person-days** — 29 to 41 months at two days a week.
This reinforces cutting scope rather than compressing the schedule.

### Minimum version — 8 to 10 days

Claim object, claim lines, the three amounts, positions and events, and the briefing pack
generator. **No** reports, **no** automatic leakage flow, **no** credit-note mechanism.

That makes the existing Excel sheet a by-product instead of a manual compilation. It is the
smallest deliverable in the whole programme with a named upcoming trigger — a customer
visit — and it is worth pulling forward ahead of several reports.

Placed in **phase 4b**, after the shipment module.

---

## 9. Open questions

1. Who decides a settlement, and above what amount does it go to the GM? The register shows
   offers of 50% and of half the cost — was that one person's judgement or a rule?
   *(DECISION-PENDING D20)*
2. Is there a standard position on delay claims, or is each argued from evidence? The
   freight claim was rejected on documentary evidence, which suggests the latter.
3. How are pending credit notes tracked today, and by whom? The Bender €7,500 has to
   attach to a future order that may not be placed for a year. *(DECISION-PENDING D21)*
4. Does finance need claims in the accounts as provisions once a position is offered, or
   only when settled? *(DECISION-PENDING D22)*
5. How many claims are open across all agents — is six across two agents typical, or is
   Germany unusual?
6. Are claims ever raised by Kao Ming against an agent or supplier, or only inbound?
