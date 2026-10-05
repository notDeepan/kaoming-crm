# Playbook — driving the build

Run these in order. One phase per session where practical; `/clear` between phases.

## Two habits that matter more than any prompt

1. **Commit after every accepted change.** Git is what saves you when a change looked
   right and was not.
2. **Use plan mode for anything touching the schema.** Schema mistakes propagate into
   every later phase.

---

## Session 0 — orient

```
Read docs/01-domain.md and docs/07-build-plan.md in full, then summarise back to me in
under 300 words: the domain, the eight phases, and the three things you think are most
likely to be got wrong. Do not write any code yet.
```

If the summary misdescribes the domain, fix `CLAUDE.md` and the `domain-context` skill
before proceeding.

---

## Phase 1

```
Enter plan mode. Plan Phase 1 from docs/07-build-plan.md: project scaffold, Docker
Compose (app, postgres, minio, caddy), Drizzle schema for docs/02-data-model.md sections
4.1 to 4.3, migrations, seed script, Auth.js with roles, app shell, next-intl with en and
zh-Hant loaded from data/i18n/zh-Hant.json.

Show me the plan, the file layout, and the schema as SQL so I can check it against
docs/02-data-model.md before you build.
```

```
Execute the plan. Use /schema-change for the schema work. Stop after
`npm run db:migrate && npm run db:seed && npm run test` passes and report the result.
```

```
/phase-review 1
```

---

## Phase 2

```
Plan Phase 2: deals, quotations with revisions, quotation lines, design reviews, discount
approval, price book version locking, the six-monthly import flow from
docs/11-price-book.md, and the English quotation PDF.

Show me explicitly in the plan:
- how a revision is created without mutating the previous one
- where gates G1, G2 and G12 refuse the transition server-side
- how the diff preview works before a price list is published
```

```
Execute. Use /new-document-type quotation for the PDF and /price-book-import for the
import flow. The PDF must match the layout of the seeded Q-2026-0147 quotation: header
block, machine spec block, OPTIONAL ACCESSORIES section, struck-through list total above
the discounted total, standard accessories in two columns, remarks.
```

```
/gate-check
/phase-review 2
```

---

## Phase 3

```
Plan Phase 3. The critical piece is deal_spec_values: the bridge between the English
quotation and the Chinese 製造規格表.

Explain in the plan how a quotation line of each item_type resolves into spec values:
machine, spec_change, accessory, service, excluded. Only the first three reach the MI.
```

```
Execute. Use /new-document-type for each of: technical-proposal, pi, mi, spec-sheet.
Reproduce the layouts in reference/forms/real-forms-layout.md exactly, including the
生管 / 核覆 / 經辦 sign-off blocks. The technical proposal is a three-part merge and
Part B never prints asterisks.
```

```
/cjk-pdf-test
/phase-review 3
```

Then print a PI and an MI on paper and take them to 生管 before building anything on top.

---

## Phase 4

```
Plan Phase 4: progress reviews and the monthly counter, slip and escalation, FAT records
and generated checklist, shipments, machines, site visits, condition photos.

Show me in the plan:
- how monthly review rows are generated when a work order is issued, and how they stop
  when the FAT passes
- how the change in expected date is attributed to the stage reported that month
- how an unfilled review past its due date surfaces as an exception
```

```
Execute. Then write integration tests walking a work order through four monthly reviews
with the expected date moving +0, +6, +22, +38 days, asserting the escalation level and
the stage attribution at each step.
```

```
/gate-check
/phase-review 4
```

---

## Phase 5

```
Plan the shared dashboard filter component first — period, date basis, agent,
country/region, model, measure, currency — then D1, A2, A3, B1, F1.

D1 is the daily working screen. Build it first and make it good. If the team does not open
it every morning, nothing downstream gets populated.
```

```
Execute D1 using /new-dashboard D1, then the rest. Every revenue tile carries its measure
label. B1 ranks on net revenue after commission, not gross.
```

---

## Phase 6

```
Plan Phase 6: parts requests with stock check and warranty determination, parts quotations
with supervisor approval, the after-sales case module from docs/10-aftersales-cases.md,
commission accrual, leakage entries, nightly penalty exposure job.

Two things to get right:
- warranty_determination has three values and the third, 'undeterminable', is the point of
  the feature. It must be countable and surfaced
- case_messages never overwrites source_text, and sent_at stays null until a person has
  reviewed the translation
```

```
Execute. Use /case-module for the case work.
```

---

## Phase 7

```
Plan and build B2, B3, C1, C2, D2, D3, E1, E2, E3, G1 and the quarterly scorecard snapshot
job.

D2 must render a slip curve per order: expected completion date at each monthly review
against the contractual date, with the 30 and 60 day thresholds. G1 must render the leakage
waterfall from list price to realised.
```

```
Ask the spec-auditor subagent to audit the whole implementation against docs/ and report
divergence.
```

---

## Prompts worth repeating

**When something feels over-built**
```
Check this against docs/09-anti-requirements.md. Have you built anything ruled out?
```

**Before any commit touching money**
```
Show me every place this change touches a monetary value. Confirm none use float and all
arithmetic happens in integer minor units.
```

**When a decision is made**
```
D3 is resolved: commission is calculated on the discounted price. Update
docs/08-decisions.md, write docs/decisions/D3.md recording the decision and who made it,
and remove the matching DECISION-PENDING comments.
```

**When a schema shortcut is proposed**
```
That denormalises data the specification keeps separate. Explain what breaks in phases 6
and 7 if we do it your way, then recommend.
```

**Session handoff**
```
Summarise what we did, what passes, what is half-finished, and what the next session should
pick up. Write it to docs/session-notes/<date>.md.
```

---

## Things that will go wrong

| Symptom | Cause | Fix |
|---|---|---|
| Chinese renders as boxes in the PDF | System font, not embedded | Self-host Noto Sans TC; install fonts in the Docker image; `/cjk-pdf-test` |
| A Lead entity appears | Generic CRM pattern-matching | Point at `domain-context`; strengthen the CLAUDE.md line |
| Discount stored only on the total | Mirrors the current paper process | Reject. Line level always |
| Quotation edited in place | Simpler to implement | Reject. Revision history is the value |
| Gates as disabled buttons | Easier than server checks | `/gate-check`. UI-only enforcement is not enforcement |
| Machine translation reaches a factory document | The rule is subtle — allowed for cases only | Reject. `04-documents.md` and `10-aftersales-cases.md` §3 |
| Phase 4 work appears during phase 2 | Enthusiasm | `/phase-review` catches it |

---

## Before showing anything to management

```
/phase-review <n>
/gate-check
/cjk-pdf-test
Ask spec-auditor to audit the full implementation and report divergence.
```

Then print a PI and an MI and take them to 生管. If they do not recognise the form, the
layout is wrong, and correct data will not rescue it.
