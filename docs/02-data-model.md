# 02 · Data model

Types are PostgreSQL. `→` denotes a foreign key. Fields marked **R** are required.
Every table also carries `id uuid default gen_random_uuid()`, `created_at`, `updated_at`,
`created_by`, `updated_by`, and `deleted_at` for soft delete.

---

Types are Postgres. `→` denotes a foreign key. Fields marked **R** are required.

## 4.1 Identity and access

**`users`**

| Column | Type | Notes |
|---|---|---|
| name | text **R** | |
| email | citext **R** unique | |
| password_hash | text | |
| role | `user_role` **R** | see §5 |
| department | text | e.g. `international_sales` |
| locale | text | `en` or `zh-Hant`, default `en` |
| is_active | boolean | default true |

## 4.2 Channel

**`partners`** — the agent. One row per agent, never deleted.

| Column | Type | Notes |
|---|---|---|
| code | text **R** unique | e.g. `A16001`, matches the ERP customer code |
| name | text **R** | e.g. `TEZMAKSAN` |
| name_zh | text | for Chinese documents |
| country_code | char(2) **R** | ISO 3166-1 alpha-2 |
| region | text **R** | controlled list, see §5 |
| lifecycle_status | `partner_status` **R** | see §5 |
| relationship_type | `partner_relationship` **R** | `agent` or `distributor` |
| commission_model | `commission_model` **R** | `markup` or `commission` |
| exclusivity | `exclusivity` | |
| tier | `partner_tier` | default `unrated` |
| default_currency | char(3) | default `USD` |
| notes | text | |

**`partner_contracts`** — one per contract term. Drives non-renewal.

| Column | Type | Notes |
|---|---|---|
| partner_id | uuid → partners **R** | |
| start_date, end_date | date **R** | |
| auto_renew | boolean | |
| notice_period_days | integer | |
| notice_deadline | date | generated: `end_date - notice_period_days` |
| commission_rate | numeric(5,4) | null for mark-up partners |
| commission_base | `commission_base` | see §5 and DECISION-3 |
| ld_rate_per_week | numeric(5,4) | late delivery penalty, DECISION-1 |
| ld_cap | numeric(5,4) | as a fraction of order value |
| excludes_consequential_loss | boolean | DECISION-2 |
| document_url | text | |

**`partner_compliance_profiles`** — the destination data that blocks the MI.

| Column | Type | Notes |
|---|---|---|
| partner_id | uuid → partners **R** unique | |
| voltage | text | e.g. `380V` |
| frequency | text | e.g. `50HZ` |
| phase | text | e.g. `3相` |
| ce_variant | text | e.g. `新版CE標準(標誌依土耳其規定)` |
| label_languages | text[] | e.g. `{Turkish,English}` |
| nameplate_required | boolean | agent's own nameplate applied |
| default_colour_codes | text[] | e.g. `{790-49780H,790-49K84}` |
| is_complete | boolean | generated: all required fields present |

**`customers`** — end customers. Sparse by design.

| Column | Type | Notes |
|---|---|---|
| partner_id | uuid → partners **R** | who owns the relationship |
| name | text **R** | |
| country_code | char(2) | |
| industry | text | |
| source | `customer_source` | `agent_disclosed`, `fat_visit`, `warranty_registration` |

## 4.3 Product and pricing

**`machine_models`**

| Column | Type | Notes |
|---|---|---|
| code | text **R** unique | e.g. `KMC-637AS` |
| name_en | text **R** | e.g. `Plano Machining Center` |
| name_zh | text **R** | e.g. `高速門型加工中心機` |
| product_line | text | `boxway`, `5axis`, `gantry` |
| proposal_asset_url | text | the static model PDF, Part A of the technical proposal |
| proposal_asset_name | text | uploaded model PDF filename, when managed in CRM |
| proposal_asset_base64 | text | durable uploaded PDF bytes; null for packaged example assets |
| is_active | boolean | |

**`spec_categories`** — the eight-ish groupings of the 製造規格表. Seeded, not user-created.

| Column | Type | Notes |
|---|---|---|
| code | text **R** unique | e.g. `spindle` |
| name_en | text **R** | e.g. `Spindle` |
| name_zh | text **R** | e.g. `主軸` |
| sort_order | integer **R** | print order on the spec sheet |
| appears_on | text[] | any of `quotation`, `proposal`, `spec_sheet` |

Seed: `standard_accessories 標準附件`, `spindle 主軸`, `tool_magazine 刀庫及護罩`,
`controller 控制器及CRT`, `travels 行程`, `table 工作台`, `coolant 冷卻系統`,
`chip_conveyor 排屑機`, `attachment_head 附件頭`, `electrical 電壓`,
`compliance 規格及銘牌文字`, `colour 顏色`, `special 特別附件`.

**`items`** — the bilingual item master. **This is the keystone table.**

| Column | Type | Notes |
|---|---|---|
| code | text **R** unique | matches the ERP item code where one exists |
| name_en | text **R** | as printed on the quotation |
| name_zh | text **R** | as printed on the 製造規格表 |
| item_type | `item_type` **R** | see below |
| spec_category_id | uuid → spec_categories | null for services |
| machine_model_id | uuid → machine_models | null if model-agnostic |
| spec_override | jsonb | for `spec_change` items: which spec values this replaces |
| is_standard_accessory | boolean | included in the base machine |
| unit | text | default `set` |

`item_type` determines downstream behaviour and must be right:

| Value | Reaches the MI? | Behaviour |
|---|---|---|
| `machine` | yes | The base machine |
| `spec_change` | yes | Overwrites a base specification value (e.g. Z travel → 1100mm) |
| `accessory` | yes | Adds to a spec category's value list |
| `service` | **no** | Commercial only (e.g. on-site levelling technician) |
| `excluded` | **no** | Priced but outside the total (e.g. a probe quoted separately) |

**`price_book_versions`** — prices change every six months; quotations must honour the
version live at issue.

| Column | Type | Notes |
|---|---|---|
| name | text **R** | e.g. `2026-H1` |
| effective_from | date **R** | |
| effective_to | date | null = current |
| is_published | boolean | |

**`prices`**

| Column | Type | Notes |
|---|---|---|
| price_book_version_id | uuid **R** | |
| item_id | uuid → items **R** | |
| region_band | `region_band` **R** | `eu` or `non_eu` — EU carries higher prices |
| currency | char(3) **R** | `USD`, `EUR`, `TWD` |
| amount | numeric(14,2) **R** | agent price, not customer price |

Unique on `(price_book_version_id, item_id, region_band, currency)`.

## 4.4 The deal

**`deals`** — the spine. One machine opportunity.

| Column | Type | Notes |
|---|---|---|
| deal_number | text **R** unique | `Q-2026-0147`, generated |
| partner_id | uuid → partners **R** | |
| customer_id | uuid → customers | often null early |
| machine_model_id | uuid → machine_models | |
| sales_stage | `sales_stage` **R** | pre-PO, see §5 |
| project_stage | `project_stage` | post-PO, null until won |
| enquiry_date | date **R** | |
| currency | char(3) | default `USD` |
| region_band | `region_band` **R** | drives which price column applies |
| lost_reason | `lost_reason` | |
| owner_id | uuid → users **R** | |

**`quotations`** — versioned. Never edit in place; create the next revision.

| Column | Type | Notes |
|---|---|---|
| deal_id | uuid → deals **R** | |
| revision | integer **R** | 1, 2, 3… unique with deal_id |
| status | `document_status` **R** | see §5 |
| price_book_version_id | uuid **R** | locked at issue |
| issued_at | timestamptz | |
| valid_until | date | issued_at + 3 months |
| payment_terms | text | e.g. `30% down payment, balance by irrevocable at sight LC before shipment` |
| delivery_terms | text | e.g. `FOB TAIWAN` |
| lead_time_text | text | e.g. `Within 10-12 months after receiving down payment` |
| lead_time_weeks_from | `lead_time_basis` | `po`, `deposit` — D4 |
| lead_time_ends_at | `lead_time_terminus` | `ready_to_ship` or `arrived` — DECISION-PENDING D19. With booking adding 2–3 weeks these are materially different promises |
| incoterm | `incoterm` **R** | e.g. `FOB`. Already on paper quotations as *Place of Delivery* |
| warranty_months | integer | DECISION-5 |
| list_total | numeric(14,2) | sum of included lines before discount |
| discount_amount | numeric(14,2) | |
| net_total | numeric(14,2) | |
| discount_approved_by | uuid → users | |
| discount_approved_at | timestamptz | |
| design_review_id | uuid → design_reviews | required before final |
| supersedes_id | uuid → quotations | previous revision |

**`quotation_lines`**

| Column | Type | Notes |
|---|---|---|
| quotation_id | uuid **R** | |
| line_no | integer **R** | |
| item_id | uuid → items **R** | |
| item_type | `item_type` **R** | denormalised, frozen at issue |
| description_en | text **R** | frozen copy — items may be renamed later |
| description_zh | text **R** | frozen copy |
| quantity | numeric(10,2) **R** | |
| unit_price | numeric(14,2) **R** | from the locked price book version |
| line_discount | numeric(14,2) | **capture at line level, not just on the total** |
| line_total | numeric(14,2) **R** | |
| is_included_in_total | boolean **R** | false for `excluded` items |

**`design_reviews`** — the accessory-compatibility gate. Fit is decided case by case
with the design team; there are no encodable compatibility rules.

| Column | Type | Notes |
|---|---|---|
| deal_id | uuid **R** | |
| requested_at | timestamptz **R** | |
| reviewed_by | text | engineer name |
| reviewed_at | timestamptz | |
| outcome | `design_review_outcome` | `confirmed`, `rejected`, `pending` |
| notes | text | |

**`technical_proposals`** — issued with the final quotation, same revision.

| Column | Type | Notes |
|---|---|---|
| quotation_id | uuid **R** unique | one per quotation revision |
| generated_at | timestamptz | |
| pdf_url | text | merged Part A + generated Parts B and C |

## 4.5 Configuration — the bridge between English and Chinese

**`deal_spec_values`** — the resolved configuration. Generated from the final quotation's
lines plus the compliance profile, then editable before the spec sheet is locked.

| Column | Type | Notes |
|---|---|---|
| deal_id | uuid **R** | |
| spec_category_id | uuid **R** | |
| value_en | text **R** | e.g. `ISO 50 / 6000 rpm (V) / 3500 rpm (H)` |
| value_zh | text **R** | e.g. `BBT50 / 主軸馬達22-26KW / 10000RPM 直結式` |
| is_upgraded | boolean | true when a `spec_change` or paid `accessory` produced it |
| source | `spec_value_source` | `base`, `quotation_line`, `compliance_profile`, `manual` |

Unique on `(deal_id, spec_category_id)`.

> **Asterisk rule.** Model literature writes `60 (*90)` where `*` marks a paid upgrade.
> A customer technical proposal **never** uses asterisks — it prints the value that
> customer is buying. Implement this in the proposal renderer.

## 4.6 Order and manufacturing

**`orders`** — the PI (P invoice, 訂單).

| Column | Type | Notes |
|---|---|---|
| deal_id | uuid **R** unique | |
| pi_number | text **R** unique | `P-2026-0147` |
| customer_po_ref | text **R** | the agent-supplied PO number |
| customer_po_url | text **R** | attached document |
| po_verified_at | timestamptz | checked line by line against the final quotation |
| po_variance_notes | text | |
| order_value | numeric(14,2) **R** | |
| deposit_percent | numeric(5,2) | |
| deposit_received_at | timestamptz | **the delivery clock starts here** |
| contractual_delivery_date | date | derived from lead time + basis |
| document_id | uuid → documents | the printed PI |

**`work_orders`** — the MI (M invoice, 製令單).

| Column | Type | Notes |
|---|---|---|
| order_id | uuid **R** unique | |
| mi_number | text **R** unique | `M-2026-0147` |
| batch_number | text | 製造批號, e.g. `227E005118` |
| issued_at | timestamptz | |
| planned_start | date | 開工日期 |
| planned_finish | date | 完工日期 |
| actual_finish | date | |
| production_status | text | 生產狀況, e.g. `未結` |
| is_provisional | boolean | 預定單 |
| provisional_hold_stage | text | e.g. `assemble to 3-axis stage, await formal order` |
| document_id | uuid → documents | the printed 製令單 |

**`spec_sheets`** — 製造規格表, versioned by 版次.

| Column | Type | Notes |
|---|---|---|
| work_order_id | uuid **R** | |
| revision | integer **R** | 版次, unique with work_order_id |
| issued_at | timestamptz | |
| superseded_at | timestamptz | |
| document_id | uuid → documents | |

**`spec_sheet_lines`** — frozen copy of `deal_spec_values` at issue.

| Column | Type | Notes |
|---|---|---|
| spec_sheet_id | uuid **R** | |
| spec_category_id | uuid **R** | |
| value_zh | text **R** | |
| sort_order | integer | |

**`spec_sheet_distributions`** — who holds a paper copy. Solves the stale-paper problem.

| Column | Type | Notes |
|---|---|---|
| spec_sheet_id | uuid **R** | |
| department | text **R** | `生管`, `採購`, `製造` |
| distributed_at | timestamptz | |
| acknowledged_at | timestamptz | |

## 4.7 Progress tracking

**`progress_reviews`** — the monthly counter. Starts when the MI is issued, stops when
the FAT is cleared. **This is the highest-value feature in the system.**

| Column | Type | Notes |
|---|---|---|
| work_order_id | uuid **R** | |
| sequence | integer **R** | M+1, M+2 …, unique with work_order_id |
| due_date | date **R** | generated monthly from `work_orders.issued_at` |
| filled_at | timestamptz | null = overdue, itself a red flag |
| reported_stage | text | casting, machining, assembly, wiring, run-in |
| expected_completion | date | **the critical field** |
| previous_expected | date | denormalised from the prior review |
| delta_days | integer | generated: expected − previous_expected |
| cumulative_slip_days | integer | generated: expected − contractual_delivery_date |
| delay_reason | `delay_reason` | see §5 — needed to defend penalties |
| attribution | `attribution` | see §5 |
| reported_by | text | |
| escalation_level | `escalation_level` | generated from cumulative slip |

> Record the **expected completion date**, never a percentage. A machine that is "80%
> complete" for three months looks fine. A machine whose expected date moves March →
> April → June is visibly ten weeks late in month two.

## 4.8 Inspection, shipment, installation

**`fat_records`**

| Column | Type | Notes |
|---|---|---|
| work_order_id | uuid **R** | |
| scheduled_for | date | |
| conducted_at | date | |
| outcome | `fat_outcome` | `passed`, `conditional`, `failed` |
| punch_list | jsonb | array of open items for `conditional` |
| attendees | text | |
| customer_contact_captured | boolean | the one first-party contact in the cycle |
| report_document_id | uuid → documents | |

**`fat_checklist_items`** — generated from the locked spec sheet, one row per attribute.

| Column | Type | Notes |
|---|---|---|
| fat_record_id | uuid **R** | |
| spec_category_id | uuid **R** | |
| expected_value | text **R** | |
| verified | boolean | |
| notes | text | |

**`shipments`**

| Column | Type | Notes |
|---|---|---|
| order_id | uuid **R** | |
| final_payment_received_at | timestamptz | **gates shipment** |
| forwarder_name | text | nominated by customer or agent |
| package_length_mm, package_width_mm, package_height_mm | integer | |
| gross_weight_kg | numeric(10,2) | |
| requires_shipping_mark | boolean | generated: weight > 100 or oversized |
| shipped_at, arrived_at | timestamptz | |
| bill_of_lading_ref | text | |

**`machines`** — the installed base. Created at shipment, lives forever.

| Column | Type | Notes |
|---|---|---|
| serial_number | text **R** unique | |
| order_id | uuid **R** | |
| machine_model_id | uuid **R** | |
| partner_id | uuid **R** | |
| customer_id | uuid | |
| installed_at | date | |
| accepted_at | date | **the warranty clock starts here** |
| warranty_months | integer | |
| warranty_expires_at | date | generated |

**`site_visits`** — installation and every service call.

| Column | Type | Notes |
|---|---|---|
| machine_id | uuid **R** | |
| visit_type | `visit_type` **R** | `installation`, `warranty`, `chargeable`, `inspection` |
| visited_at | date **R** | |
| engineer | text **R** | |
| work_performed | text | |
| acknowledged_by | text | customer or agent signature |
| closed_at | timestamptz | **blocked until a photo set exists** |

**`condition_photos`** — evidentiary. Also capture at FAT and at loading.

| Column | Type | Notes |
|---|---|---|
| machine_id | uuid **R** | |
| site_visit_id | uuid | null for FAT and loading sets |
| capture_point | `capture_point` **R** | `fat`, `loading`, `installation`, `service` |
| captured_at | timestamptz **R** | |
| file_url | text **R** | |
| caption | text | |

## 4.9 Aftermarket

**`parts_requests`**

| Column | Type | Notes |
|---|---|---|
| machine_id | uuid | null when the machine is unknown |
| partner_id | uuid **R** | |
| requested_at | timestamptz **R** | |
| in_stock | boolean | **the fill-rate field** |
| procurement_lead_days | integer | added to quoted delivery when not in stock |
| warranty_determination | `warranty_determination` **R** | see §5 |
| status | `parts_status` **R** | |

`warranty_determination` values: `in_warranty`, `out_of_warranty`,
**`undeterminable`** — no acceptance date on file. That third value is the point: it
quantifies free parts issued because a date was never recorded.

**`parts_quotations`**

| Column | Type | Notes |
|---|---|---|
| parts_request_id | uuid **R** | |
| quote_number | text **R** unique | |
| status | `document_status` **R** | |
| supervisor_approved_by | uuid → users | required before terms are completed |
| supervisor_approved_at | timestamptz | |
| payment_terms | text | default `T/T` |
| delivery_text | text | default `3-5 days after receiving your order` |
| total | numeric(14,2) | |
| is_foc | boolean | |

## 4.10 Commercial records

**`commissions`** — accrued at order confirmation, not at claim.

| Column | Type | Notes |
|---|---|---|
| order_id | uuid **R** unique | |
| partner_id | uuid **R** | |
| model | `commission_model` **R** | `markup` accrues zero |
| rate | numeric(5,4) | from the contract |
| base | `commission_base` | DECISION-3 |
| accrued_amount | numeric(14,2) **R** | |
| accrued_at | timestamptz **R** | at order confirmation |
| becomes_due_at | date | machine acceptance |
| claimed_amount | numeric(14,2) | |
| claimed_at | timestamptz | |
| variance | numeric(14,2) | generated: claimed − accrued |
| settled_at | timestamptz | |
| approved_by | uuid → users | |

**`leakage_entries`** — the margin leakage register. One row per loss.

| Column | Type | Notes |
|---|---|---|
| deal_id | uuid **R** | |
| category | `leakage_category` **R** | 34 values, see §5 |
| amount | numeric(14,2) **R** | |
| currency | char(3) **R** | |
| incurred_on | date **R** | when it arose, not when discovered |
| attribution | `attribution` **R** | |
| recovery_status | `recovery_status` **R** | |
| evidence_document_id | uuid → documents | |
| notes | text | |

**`penalty_exposures`** — forward-looking, recalculated nightly from slip.

| Column | Type | Notes |
|---|---|---|
| order_id | uuid **R** unique | |
| weeks_late | integer | ceil(cumulative_slip_days / 7) |
| rate_per_week | numeric(5,4) | from the contract |
| accrued_exposure | numeric(14,2) | weeks × rate × order_value, capped |
| cap_amount | numeric(14,2) | |
| calculated_at | timestamptz | |

## 4.11 Documents, attachments, approvals

**`documents`** — every generated artefact.

| Column | Type | Notes |
|---|---|---|
| deal_id | uuid **R** | everything hangs off the deal |
| doc_type | `doc_type` **R** | see §5 |
| doc_number | text **R** | carries the deal number |
| revision | integer | |
| language | `doc_language` **R** | `en`, `zh_hant`, `both` |
| status | `document_status` **R** | |
| pdf_url | text | |
| generated_at | timestamptz | |
| printed_at | timestamptz | |
| released_at | timestamptz | **printed → released is a measurable queue** |

**`document_approvals`** — the authorisation layer. Multiple rows per document.

| Column | Type | Notes |
|---|---|---|
| document_id | uuid **R** | |
| approval_type | `approval_type` **R** | `supervisor`, `dept_manager`, `gm`, `deputy_manager_signature`, `accounts_stamp`, `company_chop_cfo` |
| required | boolean **R** | |
| completed_by | text | |
| completed_at | timestamptz | |

**`attachments`** — the order file. Grouped by phase, not a flat dump.

| Column | Type | Notes |
|---|---|---|
| deal_id | uuid **R** | |
| group | `attachment_group` **R** | `quotation`, `order`, `manufacturing`, `delivery`, `aftermarket` |
| kind | `attachment_kind` **R** | includes `custom_change_image` |
| spec_sheet_id | uuid → spec_sheets | **bind custom change images to a 版次** |
| file_url | text **R** | |
| filename | text **R** | |
| uploaded_by | uuid → users **R** | |

> **Custom change images.** Non-standard requests reach production as pictures, not text.
> The MI is therefore incomplete on its own. Two rules: bind each image to the
> `spec_sheet_id` it was issued with, and print an attachment manifest line on the MI
> (`custom reference: 3 attachments`) so the shop floor can tell when one is missing.

**`audit_log`** — append-only.

| Column | Type | Notes |
|---|---|---|
| entity_table, entity_id | text, uuid **R** | |
| action | text **R** | |
| actor_id | uuid → users | |
| before, after | jsonb | |
| at | timestamptz **R** | |

## 4.12 Scorecards

**`scorecard_snapshots`** — one row per partner per quarter. Never recomputed in place;
tier migration over time is the point.

| Column | Type | Notes |
|---|---|---|
| partner_id | uuid **R** | |
| period | text **R** | e.g. `2026-Q3`, unique with partner_id |
| commercial_score, pipeline_score, capability_score, relationship_score | numeric(5,2) | |
| composite_score | numeric(5,2) | weighted 35 / 25 / 25 / 15 |
| tier | `partner_tier` **R** | |
| previous_tier | `partner_tier` | |
| net_revenue_12m | numeric(14,2) | **after commission — the comparable measure** |
| cost_to_serve_pct | numeric(5,2) | discount + commission + attributable leakage |
| data_points | integer | fewer than 5 ⇒ tier is `unrated` |

---


---

## 4.13 Price book import

See `11-price-book.md` for the flow.

**`price_book_imports`**

| Column | Type | Notes |
|---|---|---|
| filename | text **R** | uploaded file |
| uploaded_by | uuid → users **R** | |
| target_version_id | uuid → price_book_versions | created on publish |
| status | `import_status` **R** | `uploaded`, `validated`, `failed`, `published`, `discarded` |
| row_count | integer | |
| error_count | integer | |
| errors | jsonb | array of `{row, code, message}` |
| diff_summary | jsonb | added, removed, changed counts and the largest movements |
| published_at | timestamptz | |

---

## 4.14 After-sales cases

See `10-aftersales-cases.md` for the module.

**`cases`**

| Column | Type | Notes |
|---|---|---|
| case_number | text **R** unique | `CS-2026-0198` |
| machine_id | uuid → machines | null when the machine is unidentified |
| partner_id | uuid → partners **R** | |
| customer_id | uuid → customers | |
| case_type | `case_type` **R** | see §5 |
| priority | `case_priority` **R** | `low`, `normal`, `high`, `machine_down` |
| status | `case_status` **R** | see §5 |
| opened_at | timestamptz **R** | |
| closed_at | timestamptz | |
| owner_id | uuid → users **R** | the international sales person relaying it |
| assigned_dept | text | `售後`, `工程`, `品保` |
| resolution | text | |
| linked_parts_request_id | uuid → parts_requests | a failure that became a parts order |
| linked_site_visit_id | uuid → site_visits | a case that became an on-site visit |
| billable | boolean | whether the work was chargeable |
| billed | boolean | whether it was actually invoiced |

**`case_messages`** — the bilingual thread. One row per message in either direction.

| Column | Type | Notes |
|---|---|---|
| case_id | uuid **R** | |
| direction | `message_direction` **R** | `inbound_agent`, `outbound_agent`, `inbound_internal`, `outbound_internal` |
| source_language | char(7) **R** | `en` or `zh-Hant` |
| source_text | text **R** | exactly as received. Never overwritten |
| translated_text | text | the other language |
| translation_source | `translation_source` | `machine`, `machine_edited`, `human` |
| translated_by | uuid → users | who reviewed it |
| sent_at | timestamptz | null while still a draft |
| attachments | jsonb | file references |

**`case_state_log`** — every status change with its timestamp, so time-in-state is
measurable. `case_id`, `from_status`, `to_status`, `at`, `by`.

---

## 4.15 Logistics additions

See `12-logistics.md`.

**`parts_requests`** — additional columns for the identification and pricing round-trips.

| Column | Type | Notes |
|---|---|---|
| identification_requested_at | timestamptz | sent to 售後 |
| identification_received_at | timestamptz | |
| identified_by | text | who in 售後 confirmed the part number |
| pricing_requested_at | timestamptz | sent to 採購 / 生管 |
| pricing_received_at | timestamptz | |
| priced_by | text | |
| price_source | `price_source` | `price_book`, `procurement_quote`, `production_quote` |
| linked_case_id | uuid → cases | the enquiry usually arrives as a `part_failure` case |
| alternative_item_id | uuid → items | suggested when the described part is unavailable |
| alternative_outcome | text | `accepted`, `rejected`, `pending` |
| alternative_rejection_reason | text | a lost parts sale with a reason. Feeds report E2 |

**`shipments`** — additional columns for the nine-stage flow.

| Column | Type | Notes |
|---|---|---|
| completion_notified_at | timestamptz | E0 — 完工通知 from 製造 to logistics |
| booking_requested_at | timestamptz | E1 — 訂艙 |
| booking_confirmed_at | timestamptz | E2. Null while waiting for space |
| booking_attempts | integer | how many times space was sought. Counted, never overwritten |
| booking_reference | text | forwarder's reference |
| vessel_or_flight | text | |
| etd | date | |
| eta | date | |
| shipping_notice_sent_at | timestamptz | E3 — 出貨通知 |
| shipping_order_printed_at | timestamptz | E6 — 出貨單 |
| forwarder_nominated_by | `forwarder_nominator` | **Derived** from the incoterm: FOB → `customer`, CIF → `kao_ming` |
| incoterm | `incoterm` | Carried from the quotation |
| freight_cost | numeric(14,2) | CIF only. Compare against what was priced into the quotation |
| booking_due_by | date | Generated: contractual delivery − 21 days. Drives the payment-in-time alert |

Two inbound attachments stored against the shipment: the forwarder's booking confirmation
and the bill of lading.

---

## 4.16 Commercial claims and disputes

See `13-claims-disputes.md`.

**`claims`** — one per 請款 received from an agent or customer.

| Column | Type | Notes |
|---|---|---|
| claim_number | text **R** unique | `CL-2026-0031` |
| machine_id | uuid → machines **R** | always about a specific serial |
| order_id | uuid → orders | |
| partner_id | uuid → partners **R** | |
| customer_id | uuid → customers | |
| linked_case_id | uuid → cases | a case that escalated |
| received_at | date **R** | 收到請款日期 |
| source_reference | text | the email subject line, for traceability |
| category | `claim_category` **R** | see §5 |
| description | text **R** | 問題內容 |
| claimed_amount | numeric(14,2) **R** | 請款金額 |
| claimed_currency | char(3) **R** | the real register mixes EUR and USD |
| offered_amount | numeric(14,2) | what Kao Ming offered |
| offered_currency | char(3) | |
| settled_amount | numeric(14,2) | what was agreed |
| settled_currency | char(3) | |
| base_amount_usd | numeric(14,2) | for aggregation only, with rate and rate date |
| fx_rate, fx_rate_date | numeric(12,6), date | |
| kao_ming_position | text | 高明提出的處理方案. **One sentence of this goes on the briefing pack** |
| outcome | text | 最終處理結果 |
| responsibility | `claim_responsibility` **R** | drives whether it becomes a leakage entry |
| settlement_method | `settlement_method` | |
| cost_share_pct | numeric(5,2) | for `cost_share` |
| pending_credit | boolean | a `credit_note` settlement not yet applied to an order |
| applied_to_order_id | uuid → orders | where a pending credit was eventually used |
| status | `claim_status` **R** | |
| owner_id | uuid → users **R** | |
| opened_at, closed_at | timestamptz | |

**`claim_lines`** — one per 請款項目. Positions are often stated line by line, not on the
total.

| Column | Type | Notes |
|---|---|---|
| claim_id | uuid **R** | |
| line_no | integer **R** | |
| description | text **R** | |
| amount | numeric(14,2) **R** | |
| currency | char(3) **R** | |
| accepted | boolean | whether Kao Ming accepted this line |
| notes | text | |

**`claim_events`** — every position stated, counter-offer, meeting and agreement.

| Column | Type | Notes |
|---|---|---|
| claim_id | uuid **R** | |
| event_type | `claim_event_type` **R** | `received`, `position_sent`, `counter_offer`, `meeting`, `agreed`, `rejected`, `settled` |
| occurred_at | date **R** | |
| summary | text **R** | |
| attachment_url | text | 附件 |
| recorded_by | uuid → users | |
