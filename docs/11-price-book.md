# 11 · Price book — six-monthly import

Prices are revised every six months. A quotation must honour the prices in force on the
day it was issued, which the schema already handles through `price_book_versions` and the
`price_book_version_id` locked onto each quotation. What is missing is the flow to get a
new list in.

---

## 1. The flow

Four steps. The third is the one that matters.

### Upload
An Excel or CSV file matching the template in `data/import-templates/price-list.csv`.
Fixed columns, checked by header name not position:

```
item_code, name_en, name_zh, unit, spec_category, price_usd_eu, price_usd_non_eu, price_twd
```

### Validate
Nothing is written until validation passes. Report every problem at once, with row
numbers, rather than failing on the first.

| Check | Error code |
|---|---|
| Item code exists in the item master | `UNKNOWN_ITEM` |
| Item code not duplicated in the file | `DUPLICATE_ITEM` |
| Both EU and non-EU prices present and numeric | `MISSING_PRICE`, `BAD_NUMBER` |
| Price is positive | `NON_POSITIVE` |
| `spec_category` matches a seeded category | `UNKNOWN_CATEGORY` |
| `name_zh` present for any new item | `MISSING_品名` |

That last one is deliberate. An item entering the price book without a Chinese name will
block an MI months later, when nobody remembers where it came from. Catch it here.

### Preview the diff
**This is the safeguard.** Before publishing, show:

- items added, removed, and changed, as counts
- the ten largest movements by percentage, with old and new prices
- the average movement across the list
- any item that disappeared but appears on an open quotation

A 6% average increase with one line at +240% is a typo in the source spreadsheet. It is far
cheaper to catch there than in a quotation to an agent. Require an explicit confirmation
tick before publish.

### Publish
Creates a new `price_book_versions` row with an effective date, closes the previous
version's `effective_to`, and writes the `prices` rows.

---

## 2. Rules

- Publishing **never touches quotations already issued.** They keep their locked version.
- A new version cannot take effect before the previous version ends. No overlaps, no gaps.
- A version cannot be published with validation errors outstanding — **gate G12**.
- Publishing is restricted to `admin` and `manager` roles.
- Every import is retained in `price_book_imports` with its errors and diff, whether it was
  published or discarded. When a price is disputed a year later, the file that produced it
  is still there.
- An item can be removed from a new version. It stays in the item master and on historical
  quotations; it simply has no current price and cannot be added to a new quotation.

---

## 3. Two related cases

**Quotation straddling a revision.** A quotation issued in March with three months'
validity may be accepted in July, after the July price list took effect. The quotation
honours March prices — that is the whole purpose of version locking. Report C2 should
surface how much value sat on superseded price books at acceptance, since it is a real cost
that nobody currently sees.

**Mid-version correction.** A wrong price occasionally needs fixing without waiting six
months. Handle it as a new version with a short effective period rather than editing a
published one. Editing in place would silently change what past quotations were priced
from.

---

## 4. Where it sits

Phase 2, alongside the quotation engine, because that is when quotations start needing a
price book. Roughly **4–6 days** including validation, diff preview and tests.

Screen: no wireframe was drawn for this. Follow the conventions in `06-screens.md` — an
upload panel, a validation result table with row numbers, a diff table with the largest
movements highlighted, and a single primary action to publish.
