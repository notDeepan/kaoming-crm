# 10 · After-sales cases

A bilingual case relay. This module was added after the rest of the specification and may
account for a large share of the international sales team's actual week.

---

## 1. The problem

After a machine is installed the customer runs into problems: a part fails, they need an
SOP for a spare part they have not used before, they want an engineer on site to repair or
to train their operators, or an item they sent back for repair returned with new faults.

The customer writes in English, through the agent. After-sales and engineering work in
Chinese. **The international sales team sits in the middle, translating in both directions
and chasing both parties until the case closes.** None of it is recorded, so nobody can
say how long cases take, which models cause them, or how much of the team's time goes into
translation.

---

## 2. The case object

One record per issue, attached to a machine serial, an agent and — where known — an end
customer. Schema in `02-data-model.md` §4.14.

### Types

| Type | Typical content |
|---|---|
| `part_failure` | A component has broken. Usually spawns a parts request |
| `documentation_request` | SOP, manual, wiring diagram, procedure for a new spare part |
| `onsite_repair` | Customer wants an engineer to travel and fix the machine |
| `onsite_training` | Customer wants operator or maintenance training on site |
| `repair_return_dispute` | An item returned from repair with problems |
| `technical_query` | Anything else requiring an engineering answer |

### States

```
received → translated → with_engineering → response_received
         → translated_back → sent_to_agent → awaiting_customer
         → resolved → closed
```

Plus `on_hold_parts` for cases waiting on a component, enterable from any state.

Every transition writes a row to `case_state_log`. That table is the whole point: it makes
time-in-state measurable, and the split between *waiting for engineering*, *waiting for
translation* and *waiting for the customer* is the finding this module exists to produce.

---

## 3. The bilingual thread

`case_messages` holds one row per message in either direction. Each row carries:

- **`source_text`** — exactly as received, never overwritten
- **`translated_text`** — the other language
- **`source_language`** — `en` or `zh-Hant`
- **`translation_source`** — `machine`, `machine_edited`, or `human`

So a case reads as one conversation rather than two disconnected email chains, and anyone
picking it up sees the full history in either language.

### Machine translation belongs here

This contradicts the rule for factory documents, and the difference is real.

| | Factory documents | Case correspondence |
|---|---|---|
| Vocabulary | Controlled. The shop floor must see identical wording every time | One-off prose |
| Cost of variation | The factory stops trusting the paper | None |
| Review | None — it prints and goes to the floor | A person reads and edits before sending |
| Alternative | A stored 品名, entered once | The user retypes the whole message |

**Draft the translation automatically, let the person edit and approve, store both
versions and record which of the three sources it was.** Never send an unreviewed machine
translation — the `sent_at` field stays null until a person has approved it.

Track `translation_source` because after a few months it answers a useful question: what
proportion of drafts were sent unedited? That is the measure of whether this is saving
real time.

---

## 4. Links to the rest of the system

| Case type | Links to |
|---|---|
| `part_failure` | `parts_requests` — the case spawns the request, which carries its own warranty determination and stock check |
| `onsite_repair`, `onsite_training` | `site_visits` — and therefore the condition photo set required by gate G10 |
| `repair_return_dispute` | The original `site_visits` or `parts_requests` record |
| Any | `machines`, so case history is visible on the machine record for its whole life |

---

## 5. What it measures

None of this exists today.

| Metric | Why |
|---|---|
| Cases per machine model | A model generating disproportionate failures is a product signal. Same argument as the warranty claim rate on report E1 |
| Cases per agent | Some agents filter and resolve locally; others forward everything |
| Time in each state | Split between engineering, translation and the customer. The delay is probably not where people assume |
| On-site visits requested, delivered, billed, absorbed | The quotation often states that travel is billable to the agent. Whether it is actually invoiced is unknown |
| Repair returns with faults | A repair-quality measure nobody has |
| Messages translated per week | Quantifies work that is currently invisible |
| Proportion of machine drafts sent unedited | Whether the translation assist is earning its place |

These produce report **E3 · After-sales cases**, added to group E in `05-reports.md`.

---

## 6. The organisational question

**Does after-sales work in the system in Chinese, or does the international sales team
stay the relay?**

If after-sales log in and read cases in Chinese with the customer's message already
translated, the sales team becomes a reviewer rather than a retyper and the gain is large.
But that asks another department to change how it works, which contradicts the promise
made to the general manager that no other department is affected.

**Build for the relay first.** It needs nobody's permission. Design the case object so
after-sales can be granted access later without rework — which means: no assumption in the
schema or the UI that the sales team is the only author, and roles already distinguishing
`sales` from `service`.

---

## 7. Effort

| Item | Days |
|---|---|
| Case object, bilingual thread, states, state log, links | 12–16 |
| Translation assist and review flow | 3–5 |
| Report E3 | 4–6 |
| Testing share | 6–8 |
| **Total** | **25–35** |

Placed in phase 6. **Move it to phase 4 if the volume turns out to be material** — if the
team spends several hours a week on translation, this module has a better return per day
of build than two or three of the specified reports.

---

## 8. Open questions

Recorded here rather than in `08-decisions.md` because they change the module's priority
rather than its behaviour.

1. How many cases a month?
2. How many hours a week does the international sales team spend translating them?
3. Does after-sales already track cases anywhere, even informally?
4. Are on-site visits usually billed, or usually absorbed?
