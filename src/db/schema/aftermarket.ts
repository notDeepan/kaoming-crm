import { boolean, date, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { casePriorityEnum, caseStatusEnum, caseTypeEnum, commissionBaseEnum, commissionModelEnum,
  documentStatusEnum, messageDirectionEnum, partsStatusEnum, priceSourceEnum,
  translationSourceEnum, warrantyDeterminationEnum } from '../enums';
import { auditColumns } from './common';
import { customers, partners } from './channel';
import { machines, siteVisits } from './delivery';
import { documents, orders } from './manufacturing';
import { items } from './catalog';
import { users } from './identity';

export const serviceCases = pgTable('cases', {
  ...auditColumns,
  caseNumber: text('case_number').notNull(),
  machineId: uuid('machine_id').references(() => machines.id),
  partnerId: uuid('partner_id').references(() => partners.id).notNull(),
  customerId: uuid('customer_id').references(() => customers.id),
  caseType: caseTypeEnum('case_type').notNull(),
  priority: casePriorityEnum('priority').default('normal').notNull(),
  status: caseStatusEnum('status').default('received').notNull(),
  subject: text('subject').notNull(),
  openedAt: timestamp('opened_at', { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  ownerId: uuid('owner_id').references(() => users.id).notNull(),
  assignedDept: text('assigned_dept'),
  resolution: text('resolution'),
  linkedPartsRequestId: uuid('linked_parts_request_id'),
  linkedSiteVisitId: uuid('linked_site_visit_id').references(() => siteVisits.id),
  billable: boolean('billable'),
  billed: boolean('billed'),
}, (t) => [uniqueIndex('cases_number_unique').on(t.caseNumber),
  index('cases_partner_status_idx').on(t.partnerId, t.status),
  index('cases_machine_idx').on(t.machineId)]);

export const caseMessages = pgTable('case_messages', {
  ...auditColumns,
  caseId: uuid('case_id').references(() => serviceCases.id).notNull(),
  direction: messageDirectionEnum('direction').notNull(),
  sourceLanguage: varchar('source_language', { length: 7 }).notNull(),
  sourceText: text('source_text').notNull(),
  translatedText: text('translated_text'),
  translationSource: translationSourceEnum('translation_source'),
  translatedBy: uuid('translated_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  attachments: jsonb('attachments').$type<string[]>().default([]).notNull(),
}, (t) => [index('case_messages_case_created_idx').on(t.caseId, t.createdAt)]);

export const caseStateLog = pgTable('case_state_log', {
  ...auditColumns,
  caseId: uuid('case_id').references(() => serviceCases.id).notNull(),
  fromStatus: caseStatusEnum('from_status'),
  toStatus: caseStatusEnum('to_status').notNull(),
  at: timestamp('at', { withTimezone: true }).defaultNow().notNull(),
  by: uuid('by').references(() => users.id).notNull(),
}, (t) => [index('case_state_log_case_at_idx').on(t.caseId, t.at)]);

export const partsRequests = pgTable('parts_requests', {
  ...auditColumns,
  requestNumber: text('request_number').notNull(),
  machineId: uuid('machine_id').references(() => machines.id),
  partnerId: uuid('partner_id').references(() => partners.id).notNull(),
  requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
  requestedDescription: text('requested_description').notNull(),
  requestedQuantity: integer('requested_quantity').default(1).notNull(),
  identifiedItemId: uuid('identified_item_id').references(() => items.id),
  identifiedPartNumber: text('identified_part_number'),
  alternativeItemId: uuid('alternative_item_id').references(() => items.id),
  alternativePartNumber: text('alternative_part_number'),
  alternativeOutcome: text('alternative_outcome'),
  alternativeRejectionReason: text('alternative_rejection_reason'),
  inStock: boolean('in_stock'),
  procurementLeadDays: integer('procurement_lead_days'),
  warrantyDetermination: warrantyDeterminationEnum('warranty_determination').notNull(),
  status: partsStatusEnum('status').default('requested').notNull(),
  identificationRequestedAt: timestamp('identification_requested_at', { withTimezone: true }),
  identificationReceivedAt: timestamp('identification_received_at', { withTimezone: true }),
  identifiedBy: text('identified_by'),
  pricingRequestedAt: timestamp('pricing_requested_at', { withTimezone: true }),
  pricingReceivedAt: timestamp('pricing_received_at', { withTimezone: true }),
  pricedBy: text('priced_by'),
  priceSource: priceSourceEnum('price_source'),
  unitPrice: numeric('unit_price', { precision: 14, scale: 2 }),
  currency: varchar('currency', { length: 3 }),
  linkedCaseId: uuid('linked_case_id').references(() => serviceCases.id),
}, (t) => [uniqueIndex('parts_requests_number_unique').on(t.requestNumber),
  index('parts_requests_partner_status_idx').on(t.partnerId, t.status),
  index('parts_requests_case_idx').on(t.linkedCaseId)]);

export const partsQuotations = pgTable('parts_quotations', {
  ...auditColumns,
  partsRequestId: uuid('parts_request_id').references(() => partsRequests.id).notNull(),
  quoteNumber: text('quote_number').notNull(),
  status: documentStatusEnum('status').default('draft').notNull(),
  preparedBy: uuid('prepared_by').references(() => users.id).notNull(),
  supervisorApprovedBy: uuid('supervisor_approved_by').references(() => users.id),
  supervisorApprovedAt: timestamp('supervisor_approved_at', { withTimezone: true }),
  paymentTerms: text('payment_terms').default('T/T'),
  deliveryText: text('delivery_text'),
  total: numeric('total', { precision: 14, scale: 2 }),
  currency: varchar('currency', { length: 3 }).notNull(),
  isFoc: boolean('is_foc').default(false).notNull(),
  documentId: uuid('document_id').references(() => documents.id),
  pdfBase64: text('pdf_base64'),
  issuedAt: timestamp('issued_at', { withTimezone: true }),
}, (t) => [uniqueIndex('parts_quotations_number_unique').on(t.quoteNumber),
  uniqueIndex('parts_quotations_request_unique').on(t.partsRequestId)]);

export const commissions = pgTable('commissions', {
  ...auditColumns,
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  partnerId: uuid('partner_id').references(() => partners.id).notNull(),
  model: commissionModelEnum('model').notNull(),
  rate: numeric('rate', { precision: 5, scale: 4 }),
  base: commissionBaseEnum('base'),
  accruedAmount: numeric('accrued_amount', { precision: 14, scale: 2 }).notNull(),
  accruedAt: timestamp('accrued_at', { withTimezone: true }).notNull(),
  becomesDueAt: date('becomes_due_at'),
  claimedAmount: numeric('claimed_amount', { precision: 14, scale: 2 }),
  claimedAt: timestamp('claimed_at', { withTimezone: true }),
  variance: numeric('variance', { precision: 14, scale: 2 }),
  settledAt: timestamp('settled_at', { withTimezone: true }),
  approvedBy: uuid('approved_by').references(() => users.id),
}, (t) => [uniqueIndex('commissions_order_unique').on(t.orderId),
  index('commissions_partner_idx').on(t.partnerId)]);

export const penaltyExposures = pgTable('penalty_exposures', {
  ...auditColumns,
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  weeksLate: integer('weeks_late').notNull(),
  ratePerWeek: numeric('rate_per_week', { precision: 5, scale: 4 }).notNull(),
  accruedExposure: numeric('accrued_exposure', { precision: 14, scale: 2 }).notNull(),
  capAmount: numeric('cap_amount', { precision: 14, scale: 2 }).notNull(),
  calculatedAt: timestamp('calculated_at', { withTimezone: true }).notNull(),
}, (t) => [uniqueIndex('penalty_exposures_order_unique').on(t.orderId)]);
