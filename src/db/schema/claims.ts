import { boolean, date, index, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { attributionEnum, claimCategoryEnum, claimEventTypeEnum, claimResponsibilityEnum, claimStatusEnum, leakageCategoryEnum, recoveryStatusEnum, settlementMethodEnum } from '../enums';
import { auditColumns } from './common';
import { customers, partners } from './channel';
import { deals } from './deals';
import { machines } from './delivery';
import { documents, orders } from './manufacturing';
import { users } from './identity';

export const claims = pgTable('claims', {
  ...auditColumns,
  claimNumber: text('claim_number').notNull(),
  machineId: uuid('machine_id').references(() => machines.id).notNull(),
  orderId: uuid('order_id').references(() => orders.id),
  partnerId: uuid('partner_id').references(() => partners.id).notNull(),
  customerId: uuid('customer_id').references(() => customers.id),
  linkedCaseId: uuid('linked_case_id'),
  receivedAt: date('received_at').notNull(),
  sourceReference: text('source_reference'),
  category: claimCategoryEnum('category').notNull(),
  description: text('description').notNull(),
  claimedAmount: numeric('claimed_amount', { precision: 14, scale: 2 }).notNull(),
  claimedCurrency: varchar('claimed_currency', { length: 3 }).notNull(),
  offeredAmount: numeric('offered_amount', { precision: 14, scale: 2 }),
  offeredCurrency: varchar('offered_currency', { length: 3 }),
  settledAmount: numeric('settled_amount', { precision: 14, scale: 2 }),
  settledCurrency: varchar('settled_currency', { length: 3 }),
  baseAmountUsd: numeric('base_amount_usd', { precision: 14, scale: 2 }),
  fxRate: numeric('fx_rate', { precision: 12, scale: 6 }),
  fxRateDate: date('fx_rate_date'),
  kaoMingPosition: text('kao_ming_position'),
  nextAction: text('next_action'),
  outcome: text('outcome'),
  responsibility: claimResponsibilityEnum('responsibility').notNull(),
  settlementMethod: settlementMethodEnum('settlement_method'),
  costSharePct: numeric('cost_share_pct', { precision: 5, scale: 2 }),
  pendingCredit: boolean('pending_credit').default(false).notNull(),
  appliedToOrderId: uuid('applied_to_order_id').references(() => orders.id),
  status: claimStatusEnum('status').default('received').notNull(),
  ownerId: uuid('owner_id').references(() => users.id).notNull(),
  openedAt: timestamp('opened_at', { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
}, (t) => [uniqueIndex('claims_number_unique').on(t.claimNumber), index('claims_partner_status_idx').on(t.partnerId, t.status), index('claims_machine_idx').on(t.machineId)]);

export const claimLines = pgTable('claim_lines', {
  ...auditColumns,
  claimId: uuid('claim_id').references(() => claims.id).notNull(),
  lineNo: integer('line_no').notNull(),
  description: text('description').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  accepted: boolean('accepted'),
  notes: text('notes'),
}, (t) => [uniqueIndex('claim_lines_number_unique').on(t.claimId, t.lineNo)]);

export const claimEvents = pgTable('claim_events', {
  ...auditColumns,
  claimId: uuid('claim_id').references(() => claims.id).notNull(),
  eventType: claimEventTypeEnum('event_type').notNull(),
  occurredAt: date('occurred_at').notNull(),
  summary: text('summary').notNull(),
  attachmentUrl: text('attachment_url'),
  recordedBy: uuid('recorded_by').references(() => users.id),
}, (t) => [index('claim_events_claim_date_idx').on(t.claimId, t.occurredAt)]);

export const leakageEntries = pgTable('leakage_entries', {
  ...auditColumns,
  dealId: uuid('deal_id').references(() => deals.id).notNull(),
  category: leakageCategoryEnum('category').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  incurredOn: date('incurred_on').notNull(),
  attribution: attributionEnum('attribution').notNull(),
  recoveryStatus: recoveryStatusEnum('recovery_status').notNull(),
  evidenceDocumentId: uuid('evidence_document_id').references(() => documents.id),
  sourceClaimId: uuid('source_claim_id').references(() => claims.id),
  notes: text('notes'),
}, (t) => [uniqueIndex('leakage_source_claim_unique').on(t.sourceClaimId), index('leakage_deal_idx').on(t.dealId)]);
