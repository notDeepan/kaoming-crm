# Phase 3 · Configuration and Chinese documents

**Gate:** Phase 2 passed on example data (`docs/phase-reviews/phase-2.md`). Phase 4
cannot begin until a printed PI and MI are accepted by 生管.

## Source of truth

The issued quotation revision and its frozen lines are the commercial source. The
machine model's base specification values and the partner compliance profile add
factory defaults. `deal_spec_values` is the editable resolved bridge; it is locked
when a versioned 製造規格表 is issued. A document stores its source revision and a frozen
PDF so later master-data changes cannot alter a printed copy.

| Quotation line | Configuration resolution | MI/spec sheet |
|---|---|---|
| Included `machine` | Loads the model's base specification set; records the machine item as the base model | Yes, machine row |
| Included `spec_change` | Replaces its `spec_category` value with `spec_override` EN/ZH; missing override blocks generation | Yes, changed value |
| Included `accessory` | Appends bilingual item names under its category; multiple options stay distinguishable | Yes, category or special accessory row |
| `service` | Stays in the PI/commercial terms | No |
| Excluded/`excluded` | Stays on proposal Part C as a quoted option outside the total | No |

Compliance supplies electrical, labels/nameplate, and colour. Incomplete destination
data must be visible and G4 must refuse MI release. Manual edits retain `source=manual`
and an audit trail; no document silently authors values absent from its source.

## Data and transitions

1. Add `deal_spec_values`, `orders`, `work_orders`, `spec_sheets`,
   `spec_sheet_lines`, `spec_sheet_distributions`, `documents`,
   `document_approvals`, and `attachments`, plus model base specification storage.
   Use normal audit columns, enum constants and constraints. Review generated SQL
   before applying it.
2. Generate configuration from the issued quote and compliance profile. Preserve
   Chinese item-master text, keep categories in `sort_order`, and require manual
   completion of missing base values. Never merge an unissued draft into the factory
   record.
3. Record the PO attachment and verification before deal → won (G3). Snapshot the
   issued quote into PI 訂單 with P-number, totals, terms, and approval rows.
4. Create MI 製令單 and a 版次 1 製造規格表 from the order and locked configuration.
   G4 checks complete destination data; G11 requires each custom image to bind to
   the exact spec-sheet revision. On subsequent revisions, supersede the prior sheet
   while retaining each distribution and acknowledgement.
5. Implement document printed → released through required approvals (G9). Track
   the time and actor for printing, signatures/stamps, release and circulation.

## PDF work

- Bundle and embed Noto Sans TC from `public/fonts` in all Chinese PDFs. Use a single
  A4 renderer with ROC dates and a footer carrying deal number, revision, issue date.
- Create separate template/style pairs for technical proposal, PI, MI, and spec sheet;
  register every type. Part A of the proposal is the model PDF, Part B generated
  from resolved specs without asterisks, Part C from agent/customer/quote terms and
  excluded options. Merge with `pdf-lib`.
- Follow `reference/forms/real-forms-layout.md` and the PI/MI print wireframes,
  including 生管 / 核覆 / 經辦 blocks. Show attachment counts on the MI.

## Acceptance and verification

1. Tests assert machine/spec change/accessory/service/excluded resolution and that
   Chinese and English values match the issued quotation.
2. Integration tests make G3, G4, G9 and G11 refuse premature transitions.
3. Render PDFs from the seeded Q-2026-0147 example; extract Chinese text, confirm
   ROC dates and embedded Noto Sans TC, and inspect rasterized pages for glyphs.
4. Browser flow creates PI, MI and spec revision, records circulation, and confirms
   released copies remain stable after a later revision.
5. Print PI and MI and obtain 生管 acceptance. Record requested changes and repeat
   the print round before marking Phase 3 passed.

The supplied examples support software verification. Model base specs, static Part A
assets, live PO attachments, and the physical 生管 review require real business inputs
before production use.
