# 03 · Business rules, gates and enumerations

Every gate is a **server-side check that refuses the transition**, not a UI hint.

---

## Gates

Implement each as a server-side check that refuses the transition, not as a UI hint.

| ID | Transition | Blocked until |
|---|---|---|
| G1 | quotation draft → final | `design_reviews.outcome = 'confirmed'` **and** a `technical_proposals` row exists for this revision |
| G2 | quotation with discount → final | `discount_approved_by` set; dept manager, then GM |
| G3 | deal → `won` | `orders.customer_po_url` present and `po_verified_at` set |
| G4 | order → work order released | `partner_compliance_profiles.is_complete = true` for the partner, copied onto `deal_spec_values` |
| G5 | E1 → E2 payment to booking | `shipments.final_payment_received_at` set. Payment gates **booking**, not shipment — booking commits Kao Ming to freight cost |
| G6 | installation → accepted | `machines.accepted_at` set |
| G7 | accepted → commission settled | `partners.relationship_type` and `commission_model` confirmed |
| G8 | parts quotation → terms completed | `supervisor_approved_at` set |
| G9 | document printed → released | every `document_approvals` row with `required = true` has `completed_at` |
| G10 | site visit → closed | at least one `condition_photos` row for that visit |
| G11 | MI issue with custom items | every `custom_change_image` attachment has a `spec_sheet_id` |
| G12 | price book draft → published | Validation passed with zero errors, and the diff has been reviewed and confirmed |
| G14 | E2 → E3 booking request to confirmed | A booking reference and vessel are recorded |
| G15 | E4 shipping notice issued | Space is confirmed. Never notify a customer of a shipment with no vessel |
| G16 | E6 shipping order printed | Export documents complete |
| G17 | Parts quotation drafted | Part identified (or an alternative suggested and accepted) **and** priced |
| G19 | claim → settled | A settlement method and a settled amount are both recorded |
| G20 | claim settled with `responsibility = kao_ming` | A `leakage_entries` row is created automatically. Never record the concession twice |
| G21 | claim settled as `credit_note` | `pending_credit` is set. It stays open until `applied_to_order_id` is populated |
| G18 | Parts quotation approved | The approver is not the preparer. When the supervisor prepares, approval routes to the department manager |
| G13 | case → closed | A resolution is recorded, and every message in the thread has both `source_text` and `translated_text` |

### Derived rules

- **Progress counter.** On `work_orders` insert, generate `progress_reviews` rows monthly
  from `issued_at` until `contractual_delivery_date + 6 months`. Stop generating and
  close open rows when `fat_records.outcome = 'passed'`.
- **Escalation.** `cumulative_slip_days > 30` ⇒ `dept_manager`; `> 60` ⇒ `gm`.
  An unfilled review past `due_date` raises the same exception as a slip.
- **Shipping mark.** `requires_shipping_mark = gross_weight_kg > 100 OR any dimension > 2500mm`.
- **Quotation expiry.** Nightly job moves `awaiting_po` deals past `valid_until` to `expired`.
- **Penalty exposure.** Nightly recompute from `cumulative_slip_days` × `ld_rate_per_week`
  × `order_value`, capped at `ld_cap × order_value`.
- **Dormancy.** `active` partners with no order in 24 months ⇒ `dormant`. Not 12 —
  a single-machine agent legitimately goes a year between orders.
- **Tier.** `scorecard_snapshots.data_points < 5` ⇒ `tier = 'unrated'`. Never rank on
  raw revenue; normalise to percentile within region + market-size band.

---


---

## Enumerations

```ts
export const userRole = ['admin','manager','sales','logistics','finance','service','viewer'] as const;

export const partnerStatus = [
  'prospect','in_discussion','under_appointment','active',
  'dormant','under_review','notice_served','terminated','lapsed'
] as const;

export const partnerRelationship = ['agent','distributor'] as const;
export const commissionModel   = ['markup','commission'] as const;
export const commissionBase    = ['gross_invoice','net_machine_fob','after_discount','before_discount'] as const;
export const exclusivity       = ['exclusive','non_exclusive','shared'] as const;
export const partnerTier       = ['platinum','core','develop','watch','unrated'] as const;

export const salesStage = [
  'enquiry_received','requirements_gathering','draft_quotation','under_negotiation',
  'final_quotation','awaiting_po','won','lost','expired','on_hold'
] as const;

export const projectStage = [
  'order_confirmed','deposit_received','spec_locked','work_order_released',
  'in_production','provisional_hold','assembly_complete',
  'fat_scheduled','fat_passed','fat_conditional','fat_failed',
  'final_payment_received','shipping_docs','shipped','arrived',
  'installation','accepted','in_warranty','closed','cancelled','suspended'
] as const;

export const documentStatus = [
  'draft','pending_approval','approved','issued','printed',
  'awaiting_signature','released','superseded','expired','accepted'
] as const;

export const itemType     = ['machine','spec_change','accessory','service','excluded'] as const;
export const regionBand   = ['eu','non_eu'] as const;
export const leadTimeBasis= ['po','deposit'] as const;

export const delayReason  = ['supplier','capacity','design_change','customer_change',
                             'provisional_hold','quality_rework','logistics','other'] as const;
export const attribution  = ['kao_ming','supplier','customer','agent','forwarder','external'] as const;
export const escalationLevel = ['none','dept_manager','gm'] as const;

export const fatOutcome   = ['passed','conditional','failed'] as const;
export const visitType    = ['installation','warranty','chargeable','inspection'] as const;
export const capturePoint = ['fat','loading','installation','service'] as const;

export const warrantyDetermination = ['in_warranty','out_of_warranty','undeterminable'] as const;
export const partsStatus  = ['requested','awaiting_identification','identified',
                             'alternative_suggested','alternative_accepted','alternative_rejected',
                             'unidentifiable','stock_checked','awaiting_pricing','priced',
                             'awaiting_procurement','quoted','awaiting_po','confirmed',
                             'picking','shipped','closed','lost'] as const;
export const priceSource  = ['price_book','procurement_quote','production_quote'] as const;
export const forwarderNominator = ['customer','agent','kao_ming'] as const;
export const incoterm     = ['EXW','FOB','CFR','CIF','CIP','DAP','DDP'] as const;

export const claimCategory = ['late_delivery','spec_mismatch','documentation_error',
                              'installation_labour','freight_difference','design_defect',
                              'performance_shortfall','other'] as const;
export const claimStatus = ['received','under_review','position_stated','negotiating',
                            'agreed','rejected','settled','closed'] as const;
export const claimResponsibility = ['kao_ming','agent','customer','supplier',
                                    'forwarder','disputed'] as const;
export const settlementMethod = ['cash','credit_note','free_goods','cost_share',
                                 'rejected','none'] as const;
export const claimEventType = ['received','position_sent','counter_offer','meeting',
                               'agreed','rejected','settled'] as const;

export const recoveryStatus = ['absorbed','claimed','recovered','chargeable_unbilled'] as const;

export const leakageCategory = [
  // A contractual
  'late_delivery_penalty','downtime_claim','performance_shortfall','warranty_extension',
  // B concessions
  'discount','options_bundled_free','extras_added_late','price_held_past_revision','deposit_waived',
  // C aftermarket
  'foc_in_warranty','foc_out_of_warranty','foc_undeterminable','service_not_charged','travel_absorbed',
  // D execution
  'rework_after_fat','scrap','expedite_freight','overtime_recovery','second_fat_visit',
  // E logistics
  'transit_damage','demurrage','customs_error','packing_rework','freight_rate_movement',
  // F finance
  'fx_loss','lc_discrepancy','bad_debt','cost_of_capital','freight_rate_movement',
  // G channel
  'commission_overpaid','marketing_no_return','demo_unsold','dormant_territory',
  // H compliance
  'ce_rework','certification_reissue','local_approval_delay'
] as const;

export const docType = [
  'quotation','technical_proposal','pi','mi','spec_sheet','proforma_invoice',
  'commercial_invoice','packing_list','certificate_of_origin','fat_report',
  'acceptance_certificate','parts_quotation','progress_update','commission_note'
] as const;

export const approvalType = ['supervisor','dept_manager','gm',
                             'deputy_manager_signature','accounts_stamp','company_chop_cfo'] as const;

export const regions = ['europe','south_asia','southeast_asia','east_asia',
                        'north_america','latin_america','middle_east','africa','oceania'] as const;

export const importStatus = ['uploaded','validated','failed','published','discarded'] as const;

export const caseType = ['part_failure','documentation_request','onsite_repair',
                         'onsite_training','repair_return_dispute','technical_query'] as const;
export const casePriority = ['low','normal','high','machine_down'] as const;
export const caseStatus = ['received','translated','with_engineering','response_received',
                           'translated_back','sent_to_agent','awaiting_customer',
                           'on_hold_parts','resolved','closed'] as const;
export const messageDirection = ['inbound_agent','outbound_agent',
                                 'inbound_internal','outbound_internal'] as const;
export const translationSource = ['machine','machine_edited','human'] as const;
```

> `regions` is defined **once**, here. Two reports with different definitions of Europe
> will discredit both.

---

