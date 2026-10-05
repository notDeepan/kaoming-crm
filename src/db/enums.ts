import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoles = ['admin', 'manager', 'sales', 'logistics', 'finance', 'service', 'viewer'] as const;
export const partnerStatuses = ['prospect', 'in_discussion', 'under_appointment', 'active', 'dormant', 'under_review', 'notice_served', 'terminated', 'lapsed'] as const;
export const partnerRelationships = ['agent', 'distributor'] as const;
export const commissionModels = ['markup', 'commission'] as const;
export const commissionBases = ['gross_invoice', 'net_machine_fob', 'after_discount', 'before_discount'] as const;
export const exclusivities = ['exclusive', 'non_exclusive', 'shared'] as const;
export const partnerTiers = ['platinum', 'core', 'develop', 'watch', 'unrated'] as const;
export const customerSources = ['agent_disclosed', 'fat_visit', 'warranty_registration'] as const;
export const itemTypes = ['machine', 'spec_change', 'accessory', 'service', 'excluded'] as const;
export const regionBands = ['eu', 'non_eu'] as const;
export const regions = ['europe', 'south_asia', 'southeast_asia', 'east_asia', 'north_america', 'latin_america', 'middle_east', 'africa', 'oceania'] as const;
export const salesStages = ['enquiry_received', 'requirements_gathering', 'draft_quotation', 'under_negotiation', 'final_quotation', 'awaiting_po', 'won', 'lost', 'expired', 'on_hold'] as const;
export const projectStages = ['order_confirmed', 'deposit_received', 'spec_locked', 'work_order_released', 'in_production', 'provisional_hold', 'assembly_complete', 'fat_scheduled', 'fat_passed', 'fat_conditional', 'fat_failed', 'final_payment_received', 'shipping_docs', 'shipped', 'arrived', 'installation', 'accepted', 'in_warranty', 'closed', 'cancelled', 'suspended'] as const;
export const documentStatuses = ['draft', 'pending_approval', 'approved', 'issued', 'printed', 'awaiting_signature', 'released', 'superseded', 'expired', 'accepted'] as const;
export const leadTimeBases = ['po', 'deposit'] as const;
export const leadTimeTermini = ['ready_to_ship', 'arrived'] as const;
export const incoterms = ['EXW', 'FOB', 'CFR', 'CIF', 'CIP', 'DAP', 'DDP'] as const;
export const designReviewOutcomes = ['pending', 'confirmed', 'rejected'] as const;
export const importStatuses = ['uploaded', 'validated', 'failed', 'published', 'discarded'] as const;
export const docTypes = ['quotation', 'technical_proposal', 'pi', 'mi', 'spec_sheet', 'proforma_invoice', 'commercial_invoice', 'packing_list', 'certificate_of_origin', 'fat_report', 'acceptance_certificate', 'parts_quotation', 'progress_update', 'commission_note', 'shipping_notice', 'shipping_order'] as const;
export const quotationApprovalStages = ['dept_manager', 'gm'] as const;
export const specValueSources = ['base', 'quotation_line', 'compliance_profile', 'manual'] as const;
export const docLanguages = ['en', 'zh_hant', 'both'] as const;
export const approvalTypes = ['supervisor', 'dept_manager', 'gm', 'deputy_manager_signature', 'accounts_stamp', 'company_chop_cfo'] as const;
export const attachmentGroups = ['quotation', 'order', 'manufacturing', 'delivery', 'aftermarket'] as const;
export const attachmentKinds = ['customer_po', 'custom_change_image', 'model_proposal', 'technical_proposal', 'other'] as const;
export const delayReasons = ['supplier', 'capacity', 'design_change', 'customer_change', 'provisional_hold', 'quality_rework', 'logistics', 'other'] as const;
export const bookingDelayCauses = ['payment_outstanding', 'forwarder_lead_time', 'space_rejected', 'documentation', 'customer_change', 'other', 'unclassified'] as const;
export const attributions = ['kao_ming', 'supplier', 'customer', 'agent', 'forwarder', 'external'] as const;
export const escalationLevels = ['none', 'dept_manager', 'gm'] as const;
export const fatOutcomes = ['passed', 'conditional', 'failed'] as const;
export const visitTypes = ['installation', 'warranty', 'chargeable', 'inspection'] as const;
export const capturePoints = ['fat', 'loading', 'installation', 'service'] as const;
export const forwarderNominators = ['customer', 'agent', 'kao_ming'] as const;
export const claimCategories = ['late_delivery', 'spec_mismatch', 'documentation_error', 'installation_labour', 'freight_difference', 'design_defect', 'performance_shortfall', 'other'] as const;
export const claimStatuses = ['received', 'under_review', 'position_stated', 'negotiating', 'agreed', 'rejected', 'settled', 'closed'] as const;
export const claimResponsibilities = ['kao_ming', 'agent', 'customer', 'supplier', 'forwarder', 'disputed'] as const;
export const settlementMethods = ['cash', 'credit_note', 'free_goods', 'cost_share', 'rejected', 'none'] as const;
export const claimEventTypes = ['received', 'position_sent', 'counter_offer', 'meeting', 'agreed', 'rejected', 'settled'] as const;
export const recoveryStatuses = ['absorbed', 'claimed', 'recovered', 'chargeable_unbilled'] as const;
export const warrantyDeterminations = ['in_warranty', 'out_of_warranty', 'undeterminable'] as const;
export const partsStatuses = ['requested', 'awaiting_identification', 'identified',
  'alternative_suggested', 'alternative_accepted', 'alternative_rejected',
  'unidentifiable', 'stock_checked', 'awaiting_pricing', 'priced',
  'awaiting_procurement', 'quoted', 'awaiting_po', 'confirmed',
  'picking', 'shipped', 'closed', 'lost'] as const;
export const priceSources = ['price_book', 'procurement_quote', 'production_quote'] as const;
export const caseTypes = ['part_failure', 'documentation_request', 'onsite_repair',
  'onsite_training', 'repair_return_dispute', 'technical_query'] as const;
export const casePriorities = ['low', 'normal', 'high', 'machine_down'] as const;
export const caseStatuses = ['received', 'translated', 'with_engineering', 'response_received',
  'translated_back', 'sent_to_agent', 'awaiting_customer', 'on_hold_parts', 'resolved', 'closed'] as const;
export const messageDirections = ['inbound_agent', 'outbound_agent',
  'inbound_internal', 'outbound_internal'] as const;
export const translationSources = ['machine', 'machine_edited', 'human'] as const;
export const leakageCategories = [
  'late_delivery_penalty', 'downtime_claim', 'performance_shortfall', 'warranty_extension',
  'discount', 'options_bundled_free', 'extras_added_late', 'price_held_past_revision', 'deposit_waived',
  'foc_in_warranty', 'foc_out_of_warranty', 'foc_undeterminable', 'service_not_charged', 'travel_absorbed',
  'rework_after_fat', 'scrap', 'expedite_freight', 'overtime_recovery', 'second_fat_visit',
  'transit_damage', 'demurrage', 'customs_error', 'packing_rework', 'freight_rate_movement',
  'fx_loss', 'lc_discrepancy', 'bad_debt', 'cost_of_capital',
  'commission_overpaid', 'marketing_no_return', 'demo_unsold', 'dormant_territory',
  'ce_rework', 'certification_reissue', 'local_approval_delay',
] as const;

export const userRoleEnum = pgEnum('user_role', userRoles);
export const partnerStatusEnum = pgEnum('partner_status', partnerStatuses);
export const partnerRelationshipEnum = pgEnum('partner_relationship', partnerRelationships);
export const commissionModelEnum = pgEnum('commission_model', commissionModels);
export const commissionBaseEnum = pgEnum('commission_base', commissionBases);
export const exclusivityEnum = pgEnum('exclusivity', exclusivities);
export const partnerTierEnum = pgEnum('partner_tier', partnerTiers);
export const customerSourceEnum = pgEnum('customer_source', customerSources);
export const itemTypeEnum = pgEnum('item_type', itemTypes);
export const regionBandEnum = pgEnum('region_band', regionBands);
export const regionEnum = pgEnum('region', regions);
export const salesStageEnum = pgEnum('sales_stage', salesStages);
export const projectStageEnum = pgEnum('project_stage', projectStages);
export const documentStatusEnum = pgEnum('document_status', documentStatuses);
export const leadTimeBasisEnum = pgEnum('lead_time_basis', leadTimeBases);
export const leadTimeTerminusEnum = pgEnum('lead_time_terminus', leadTimeTermini);
export const incotermEnum = pgEnum('incoterm', incoterms);
export const designReviewOutcomeEnum = pgEnum('design_review_outcome', designReviewOutcomes);
export const importStatusEnum = pgEnum('import_status', importStatuses);
export const docTypeEnum = pgEnum('doc_type', docTypes);
export const quotationApprovalStageEnum = pgEnum('quotation_approval_stage', quotationApprovalStages);
export const specValueSourceEnum = pgEnum('spec_value_source', specValueSources);
export const docLanguageEnum = pgEnum('doc_language', docLanguages);
export const approvalTypeEnum = pgEnum('approval_type', approvalTypes);
export const attachmentGroupEnum = pgEnum('attachment_group', attachmentGroups);
export const attachmentKindEnum = pgEnum('attachment_kind', attachmentKinds);
export const delayReasonEnum = pgEnum('delay_reason', delayReasons);
export const bookingDelayCauseEnum = pgEnum('booking_delay_cause', bookingDelayCauses);
export const attributionEnum = pgEnum('attribution', attributions);
export const escalationLevelEnum = pgEnum('escalation_level', escalationLevels);
export const fatOutcomeEnum = pgEnum('fat_outcome', fatOutcomes);
export const visitTypeEnum = pgEnum('visit_type', visitTypes);
export const capturePointEnum = pgEnum('capture_point', capturePoints);
export const forwarderNominatorEnum = pgEnum('forwarder_nominator', forwarderNominators);
export const claimCategoryEnum = pgEnum('claim_category', claimCategories);
export const claimStatusEnum = pgEnum('claim_status', claimStatuses);
export const claimResponsibilityEnum = pgEnum('claim_responsibility', claimResponsibilities);
export const settlementMethodEnum = pgEnum('settlement_method', settlementMethods);
export const claimEventTypeEnum = pgEnum('claim_event_type', claimEventTypes);
export const recoveryStatusEnum = pgEnum('recovery_status', recoveryStatuses);
export const warrantyDeterminationEnum = pgEnum('warranty_determination', warrantyDeterminations);
export const partsStatusEnum = pgEnum('parts_status', partsStatuses);
export const priceSourceEnum = pgEnum('price_source', priceSources);
export const caseTypeEnum = pgEnum('case_type', caseTypes);
export const casePriorityEnum = pgEnum('case_priority', casePriorities);
export const caseStatusEnum = pgEnum('case_status', caseStatuses);
export const messageDirectionEnum = pgEnum('message_direction', messageDirections);
export const translationSourceEnum = pgEnum('translation_source', translationSources);
export const leakageCategoryEnum = pgEnum('leakage_category', leakageCategories);
