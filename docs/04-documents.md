# 04 · Document generation

All PDFs are produced by rendering an HTML template with Puppeteer. One shared layout
engine, one template per `doc_type`.

### Rules

1. **Every document is generated from `deal_spec_values` and `quotation_lines`.** No
   document is authored by hand. The whole point is that the item list is entered once.
2. **Chinese documents must reproduce the existing paper layout**, including the
   footer sign-off blocks `生管 / 核覆 / 經辦`. The shop floor will reject anything that
   doesn't look like what they already use. Absolute-positioned blocks, A4, ROC calendar
   dates (民國 = year − 1911).
3. **Embed Noto Sans TC.** Do not rely on a system font. Verify Chinese renders in the
   generated PDF as part of the test suite.
4. **Every page footer carries** the deal number, revision and issue date.

### Technical proposal — three parts merged

| Part | Source | Changes |
|---|---|---|
| A — model content | Static per-model PDF (`machine_models.proposal_asset_url`) | Only when the model changes |
| B — configuration spec | Generated from `deal_spec_values` | Every deal |
| C — deal page | Agent, customer, quotation number and revision, terms, warranty, **options quoted but excluded** | Every revision |

Merge with `pdf-lib`. Part B never prints asterisks.

### FAT checklist

Generated from `spec_sheet_lines`: one verification row per specification attribute.
This is what makes inspection a comparison against a document both sides hold.

---


---

## Additional documents from the logistics flow

| Document | Chinese | Language | To | Generated from |
|---|---|---|---|---|
| Shipping notice | 出貨通知 | English | Agent and customer | Shipment: vessel, ETD, ETA, package details |
| Shipping order | 出貨單 | Chinese | Internal, travels with the goods | Order + shipment |

The 出貨單 is a Chinese printed form. It must carry the same sign-off blocks as the other
internal documents. Print one and take it to the supervisor and the warehouse before
building on top of it. See `12-logistics.md`.

## Visit briefing pack

A printable per-agent document carried to customer visits, generated rather than compiled.
Bilingual. Contents and rules in `13-claims-disputes.md` §5.

Unlike the other documents this one **flags** missing information rather than refusing to
generate — an open claim with no stated position is itself something the traveller needs to
know before the meeting.

## Reference material

- `reference/forms/real-forms-layout.md` — the actual 製令單 and 製造規格表, extracted from
  the ERP's RTF export with textbox coordinates. Reproduce this layout.
- `reference/screens/18-pi-print.png` — the 訂單 print preview as designed
- `reference/screens/20-mi-print.png` — both MI pages as designed

## Verification

Chinese PDF rendering fails silently: the file generates, the size looks right, and every
glyph is a box. Use the `/cjk-pdf-test` skill after touching fonts, templates, Puppeteer
config or the Docker image.
