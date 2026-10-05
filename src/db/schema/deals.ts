import { boolean, date, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { designReviewOutcomeEnum, documentStatusEnum, importStatusEnum, incotermEnum, itemTypeEnum, leadTimeBasisEnum, leadTimeTerminusEnum, projectStageEnum, quotationApprovalStageEnum, regionBandEnum, salesStageEnum } from '../enums';
import { auditColumns } from './common';
import { partners, customers } from './channel';
import { machineModels, items, priceBookVersions } from './catalog';
import { users } from './identity';

export const deals = pgTable('deals', {
  ...auditColumns,
  dealNumber: text('deal_number').notNull(),
  partnerId: uuid('partner_id').references(() => partners.id).notNull(),
  customerId: uuid('customer_id').references(() => customers.id),
  machineModelId: uuid('machine_model_id').references(() => machineModels.id),
  salesStage: salesStageEnum('sales_stage').default('enquiry_received').notNull(),
  projectStage: projectStageEnum('project_stage'),
  enquiryDate: date('enquiry_date').notNull(),
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  regionBand: regionBandEnum('region_band').notNull(),
  // DECISION-PENDING: the source specification does not enumerate lost reasons.
  lostReason: text('lost_reason'),
  ownerId: uuid('owner_id').references(() => users.id).notNull(),
}, (table) => [
  uniqueIndex('deals_number_unique').on(table.dealNumber),
  index('deals_partner_idx').on(table.partnerId),
  index('deals_owner_stage_idx').on(table.ownerId, table.salesStage),
]);

export const designReviews = pgTable('design_reviews', {
  ...auditColumns,
  dealId: uuid('deal_id').references(() => deals.id).notNull(),
  requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
  reviewedBy: text('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  outcome: designReviewOutcomeEnum('outcome').default('pending').notNull(),
  notes: text('notes'),
}, (table) => [index('design_reviews_deal_idx').on(table.dealId)]);

export const quotations = pgTable('quotations', {
  ...auditColumns,
  dealId: uuid('deal_id').references(() => deals.id).notNull(),
  revision: integer('revision').notNull(),
  status: documentStatusEnum('status').default('draft').notNull(),
  priceBookVersionId: uuid('price_book_version_id').references(() => priceBookVersions.id).notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }),
  validUntil: date('valid_until'),
  paymentTerms: text('payment_terms'),
  deliveryTerms: text('delivery_terms'),
  leadTimeText: text('lead_time_text'),
  leadTimeWeeksFrom: leadTimeBasisEnum('lead_time_weeks_from').default('deposit').notNull(),
  // DECISION-PENDING: D19 — ready_to_ship is the documented provisional default.
  leadTimeEndsAt: leadTimeTerminusEnum('lead_time_ends_at').default('ready_to_ship').notNull(),
  incoterm: incotermEnum('incoterm').default('FOB').notNull(),
  warrantyMonths: integer('warranty_months').default(12).notNull(),
  listTotal: numeric('list_total', { precision: 14, scale: 2 }).default('0').notNull(),
  discountAmount: numeric('discount_amount', { precision: 14, scale: 2 }).default('0').notNull(),
  netTotal: numeric('net_total', { precision: 14, scale: 2 }).default('0').notNull(),
  discountApprovedBy: uuid('discount_approved_by').references(() => users.id),
  discountApprovedAt: timestamp('discount_approved_at', { withTimezone: true }),
  designReviewId: uuid('design_review_id').references(() => designReviews.id),
  supersedesId: uuid('supersedes_id'),
}, (table) => [
  uniqueIndex('quotations_deal_revision_unique').on(table.dealId, table.revision),
  index('quotations_status_idx').on(table.status),
]);

export const quotationLines = pgTable('quotation_lines', {
  ...auditColumns,
  quotationId: uuid('quotation_id').references(() => quotations.id).notNull(),
  lineNo: integer('line_no').notNull(),
  itemId: uuid('item_id').references(() => items.id).notNull(),
  itemType: itemTypeEnum('item_type').notNull(),
  descriptionEn: text('description_en').notNull(),
  descriptionZh: text('description_zh').notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).notNull(),
  lineDiscount: numeric('line_discount', { precision: 14, scale: 2 }).default('0').notNull(),
  lineTotal: numeric('line_total', { precision: 14, scale: 2 }).notNull(),
  isIncludedInTotal: boolean('is_included_in_total').default(true).notNull(),
}, (table) => [
  uniqueIndex('quotation_lines_number_unique').on(table.quotationId, table.lineNo),
  index('quotation_lines_item_idx').on(table.itemId),
]);

export const technicalProposals = pgTable('technical_proposals', {
  ...auditColumns,
  quotationId: uuid('quotation_id').references(() => quotations.id).notNull(),
  generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
  pdfUrl: text('pdf_url').notNull(),
  pdfBase64: text('pdf_base64'),
}, (table) => [uniqueIndex('technical_proposals_quotation_unique').on(table.quotationId)]);

export const quotationApprovals = pgTable('quotation_approvals', {
  ...auditColumns,
  quotationId: uuid('quotation_id').references(() => quotations.id).notNull(),
  stage: quotationApprovalStageEnum('stage').notNull(),
  approvedBy: uuid('approved_by').references(() => users.id).notNull(),
  approvedAt: timestamp('approved_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('quotation_approvals_stage_unique').on(table.quotationId, table.stage)]);

export const priceBookImports = pgTable('price_book_imports', {
  ...auditColumns,
  filename: text('filename').notNull(),
  uploadedBy: uuid('uploaded_by').references(() => users.id).notNull(),
  targetVersionId: uuid('target_version_id').references(() => priceBookVersions.id),
  status: importStatusEnum('status').default('uploaded').notNull(),
  rowCount: integer('row_count'),
  errorCount: integer('error_count'),
  errors: jsonb('errors').$type<{ row: number; code: string; message: string }[]>(),
  diffSummary: jsonb('diff_summary').$type<Record<string, unknown>>(),
  // Retain the exact uploaded bytes so a disputed price can be audited later.
  sourceBase64: text('source_base64').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
}, (table) => [index('price_book_imports_status_idx').on(table.status)]);
