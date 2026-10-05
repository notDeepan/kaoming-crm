# 06 · Screens

Thirty-three wireframes in `reference/screens/`. They are layout drawings, not final
visual design — they fix what appears on each page and how pages relate, which is the
expensive thing to change later.

---

## Navigation

Nine sections in the left sidebar, constant on every page. Logo at
`reference/screens/` sidebar — supply as a white PNG with alpha; the black original
disappears on the dark sidebar.

| Section | Contents |
|---|---|
| Home | The daily working screen |
| Deals | Every machine opportunity |
| Agents | The 59 agent records |
| Customers | End customers, where disclosed |
| Products | Models, bilingual item master, price book |
| Production | Work orders and progress reviews across all machines |
| Aftermarket | Parts, installed base, site visits, **cases** |
| Shipments | Booking queue, shipment detail, export documents — the `logistics` role's home |
| Reports | The seventeen reports, grouped |
| Settings | Users, roles, regions, shared enumerations |

## The deal page carries seven tabs

The most important structural decision in the interface. One order generates six
documents, three quotation revisions, a configuration, a production history and a file of
attachments; one page would be unreadable.

`Overview` · `Quotations` · `Configuration` · `Documents` · `Production` · `Order file` ·
`Commercial`

---

## Screen index

| File | Screen |
|---|---|
| `01-home.png` | Home — daily working screen |
| `02-deals-list.png` | Deals list |
| `03-deal-overview.png` | Deal · Overview tab |
| `04-deal-quotations.png` | Deal · Quotations tab |
| `05-deal-configuration.png` | Deal · Configuration tab — the EN↔ZH bridge |
| `06-deal-documents.png` | Deal · Documents tab — blocked orders explain themselves |
| `07-deal-production.png` | Deal · Production tab — the monthly counter |
| `07b-file-review.png` | Filing the monthly review — **how slip attaches to a stage** |
| `17-pi-create.png` | Creating the PI 訂單 |
| `18-pi-print.png` | PI print preview |
| `19-mi-create.png` | Creating the MI — English → 中文 mapping |
| `20-mi-print.png` | MI print preview, both pages |
| `08-deal-order-file.png` | Deal · Order file tab |
| `15-agents-list.png` | Agents list |
| `09-agent.png` | Agent record |
| `10-reports-index.png` | Reports index |
| `11-report-by-stage.png` … `R-g1-leakage.png` | The seventeen reports |
| `14-parts-request.png` | Parts request |

No wireframe exists for: price book import (`11-price-book.md`), case list and case detail
(`10-aftersales-cases.md`), the logistics home queue and shipment detail
(`12-logistics.md`), settings. Follow the conventions below.

---

## Conventions

| Convention | Rule |
|---|---|
| Colour by phase | Quotation purple, order blue, production amber, inspection green, shipping plum, warranty grey. Same palette across screens, reports and printed process documents |
| Red is reserved | Only overdue, blocked, or money at risk. Never decorative |
| Chips carry meaning | Item type, document status, delay cause. A chip teaches a rule without documentation |
| Gates explain themselves | A blocked action names what is missing and offers the fix, in the same panel. A disabled button teaches people the system is obstructive |
| One primary action per screen | Everything else is secondary |
| Language | Interface switches en / zh-Hant. Document content, specification values and department names stay Traditional Chinese in both |
| No percentage-complete | Dates, not proportions |
| Filters share one vocabulary | Identical on every report |

## Bilingual interface

The full Traditional Chinese string set is in `data/i18n/zh-Hant.json`, keyed by the
English string. Use it as the seed for next-intl. It was produced alongside the Chinese
wireframes, so every label in the design already has a translation.
