# 01 · The domain

Read this before writing any code.

---

## 1. The business in one page

Kao Ming Machinery (高明精機工業股份有限公司) builds large CNC machining centres in
Taichung, Taiwan and sells them internationally through roughly 59 agents. The
international sales team is 5–6 people.

**The chain.** Kao Ming never speaks to the end customer. An agent in a country finds a
customer, sends an enquiry, and Kao Ming quotes the *agent price* in USD. The agent
negotiates with its customer. A purchase order comes back through the agent. Kao Ming
builds the machine over 4–12 months, the customer flies to Taiwan to inspect it, pays the
balance, and the machine ships. Installation, warranty and spare parts follow.

**Two commercial models, decided per agent.**

| Model | How it works | Kao Ming's books |
|---|---|---|
| `markup` | Agent buys at agent price, resells at its own price | Invoices the agent. No commission. Never learns the end price |
| `commission` | End customer pays Kao Ming; agent claims commission | Invoices the customer. Pays commission |

Both deliver the same net amount for the same machine, but at different gross figures.
**Every comparison, ranking and score uses net revenue after commission.** Ranking on
gross makes commission-model agents look roughly 10% better for identical results.

**Why the system exists.** Today the same item list is retyped five or six times — into
the quotation, into each revision, into two Chinese documents, into the ERP, into the
shipping paperwork, in two languages. Production status is discovered by asking people.
Delays of two to three months have surfaced only near the delivery date. Nothing is
measured.

**The one-line pitch that got this approved:** enter the configuration once, print
everything.

---

## 2. Vocabulary

These are the real names used inside the company. Keep them in code and interface.

| Term | Chinese | Meaning |
|---|---|---|
| Agent / partner | 代理商 | The in-country counterparty. Long-lived. **Not a lead** |
| End customer | 終端客戶 | The agent's customer. Kao Ming rarely contacts them |
| Deal | — | One machine opportunity, enquiry to warranty expiry |
| Quotation | 報價單 | English, agent price, USD, versioned |
| Technical proposal | — | English, customer-facing specification, issued with the final quotation |
| PI / P invoice | 訂單 | Internal sales order, P-numbered, Chinese, printed |
| MI / M invoice | 製令單 + 製造規格表 | Work order plus specification sheet, M-numbered, Chinese, printed |
| 版次 | 版次 | Revision number of the specification sheet |
| FAT | — | Factory acceptance test. Customer inspects in Taiwan before shipment |
| 預定單 | 預定單 | Provisional order. Build to an agreed stage, then stop and wait |
| 生管 | 生管 | Production control |
| 採購 | 採購 | Procurement |
| 製造 | 製造 | Manufacturing |
| FOC | — | Free of charge, used for warranty parts |
| Slip | — | Days between the expected completion date and the contractual date |

---

## 3. Deal numbering

The current scheme encodes the issue date (`Q082826SD01`), so a revision issued on another
day receives an unrelated number and nothing links the two. Replace it:

```
Deal number     Q-2026-0147          stable for the life of the deal
Quotation       Q-2026-0147 r3       revision increments
PI              P-2026-0147
MI              M-2026-0147
Spec sheet      M-2026-0147 版次 2
Parts request   PR-2026-0412
Case            CS-2026-0198
```

Every document, attachment and record carries the deal number.

---

## 4. The lifecycle

Six phases, 35 stages. Full flow in `reference/diagrams/lifecycle.png`; per-phase flow
charts in `reference/diagrams/phase-a.png` through `phase-d.png`.

| Phase | Stages | Typical duration |
|---|---|---|
| A · Enquiry and quotation | A1–A8 | 2–10 weeks |
| B · Order confirmation | B1–B8 | 1–4 weeks |
| C · Production | C0–C5 | 4–12 months |
| D · Inspection | D1–D3 | 2–6 weeks |
| E · Payment and shipment | E0–E8 | 3–8 weeks — see `12-logistics.md` |
| F · Installation, close and aftermarket | F1–F5 | warranty period onward |

Seventeen gates block progress until required information exists. They are listed as
gates G1–G13 in `03-business-rules.md` and are the reason the system is worth building.

---

## 5. Non-negotiable constraints

| Constraint | Consequence |
|---|---|
| Manufacturing and senior management read Traditional Chinese only | Chinese documents are not optional. Full zh-Hant rendering including PDF |
| Everything important is printed on paper and circulated | Print fidelity matters more than screen polish |
| The existing ERP cannot be integrated with | No ERP API. Data is entered here and re-keyed to the ERP by humans |
| Almost every document needs a deputy manager signature; some need physical stamps | Approval and release are states, not afterthoughts |
| The team relays English↔Chinese correspondence for after-sales | A bilingual case module, `10-aftersales-cases.md` |
| The logistics supervisor runs order entry, parts enquiries and the whole shipment process | A `logistics` role and a rebuilt phase E, `12-logistics.md` |
| Prices change every six months | Versioned price book with an import flow, `11-price-book.md` |
| 5–6 users, ~60 agents, ~100 orders a year | Optimise for clarity and correctness, not scale |
| Built and maintained by one person in-house | Boring, well-documented stack. No microservices |

---

## 6. Data at go-live

No transactional history is migrated. Four tiers:

| Tier | Content | Decision |
|---|---|---|
| Master data | 59 agents with contracts and compliance profiles, ~200 items with 品名, price book, machine models | **Mandatory** — nothing works without it |
| Open orders | ~24 orders in flight at cutover, 10 fields each, no history behind them | **Load** — otherwise the order book report shows a business a tenth of its real size |
| Machines in warranty | Serial, model, agent, ship date, acceptance date, warranty months | **Load** — otherwise every parts claim lands in `undeterminable` |
| Reporting history | Flat ERP export: order date, agent, country, model, value, ship date. Reports only, no workflow | **Load** — makes the revenue reports useful on day one |
| Full transactional migration | Old quotations, documents, revisions | **Skip** |

**Legacy deals.** Deals that existed before go-live carry `is_legacy = true`, which allows
a PI to be created from a manually entered line list referencing a paper quotation. Gate
G3 is relaxed for those and only those. This must exist before go-live or the first month
is painful.

---

## 7. Worked examples in the seed data

Two real cases, in `data/seed/`. Between them they exercise nearly every path.

**Q-2026-0147 · CP Agencies (India) / FAB TOOLS · KMC-637AS.** Base machine US$686,740,
seven optional lines totalling US$184,850, list US$871,590, discounted total US$688,000
(21.1%), plus a Renishaw RMP60 probe at US$15,023 as an `excluded` line. Exercises spec
changes, accessories, a service line, an excluded line and a total-level discount that
must be captured per line.

**M-2026-0147 · TEZMAKSAN (Turkey) · KMC-218E8.** Mitsubishi M80V control, 30ATC,
380V/50HZ/3相, CE to Turkish regulation, bilingual Turkish/English warning labels, agent
nameplate, three paint codes, and a 預定單 provisional hold instructing assembly to the
three-axis stage pending a formal order. Exercises the compliance profile and the
provisional path.
