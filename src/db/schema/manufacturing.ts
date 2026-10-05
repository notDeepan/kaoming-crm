import { boolean, date, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { approvalTypeEnum, attachmentGroupEnum, attachmentKindEnum, docLanguageEnum, docTypeEnum, documentStatusEnum, specValueSourceEnum } from '../enums';
import { auditColumns } from './common';
import { deals, quotations } from './deals';
import { specCategories } from './catalog';
import { users } from './identity';

export const dealSpecValues = pgTable('deal_spec_values', {
  ...auditColumns,
  dealId: uuid('deal_id').references(() => deals.id).notNull(),
  specCategoryId: uuid('spec_category_id').references(() => specCategories.id).notNull(),
  valueEn: text('value_en').notNull(),
  valueZh: text('value_zh').notNull(),
  isUpgraded: boolean('is_upgraded').default(false).notNull(),
  source: specValueSourceEnum('source').notNull(),
  sourceQuotationId: uuid('source_quotation_id').references(() => quotations.id),
  sourceItemIds: jsonb('source_item_ids').$type<string[]>().default([]).notNull(),
}, (table) => [
  uniqueIndex('deal_spec_values_deal_category_unique').on(table.dealId, table.specCategoryId),
]);

export const documents = pgTable('documents', {
  ...auditColumns,
  dealId: uuid('deal_id').references(() => deals.id).notNull(),
  docType: docTypeEnum('doc_type').notNull(),
  docNumber: text('doc_number').notNull(),
  revision: integer('revision'),
  language: docLanguageEnum('language').notNull(),
  status: documentStatusEnum('status').default('draft').notNull(),
  pdfUrl: text('pdf_url'),
  pdfBase64: text('pdf_base64'),
  generatedAt: timestamp('generated_at', { withTimezone: true }),
  printedAt: timestamp('printed_at', { withTimezone: true }),
  releasedAt: timestamp('released_at', { withTimezone: true }),
}, (table) => [
  index('documents_deal_type_idx').on(table.dealId, table.docType),
  uniqueIndex('documents_number_revision_unique').on(table.docType, table.docNumber, table.revision),
]);

export const documentApprovals = pgTable('document_approvals', {
  ...auditColumns,
  documentId: uuid('document_id').references(() => documents.id).notNull(),
  approvalType: approvalTypeEnum('approval_type').notNull(),
  required: boolean('required').default(true).notNull(),
  completedBy: text('completed_by'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('document_approvals_type_unique').on(table.documentId, table.approvalType),
]);

export const orders = pgTable('orders', {
  ...auditColumns,
  dealId: uuid('deal_id').references(() => deals.id).notNull(),
  sourceQuotationId: uuid('source_quotation_id').references(() => quotations.id).notNull(),
  piNumber: text('pi_number').notNull(),
  customerPoRef: text('customer_po_ref').notNull(),
  customerPoUrl: text('customer_po_url').notNull(),
  poVerifiedAt: timestamp('po_verified_at', { withTimezone: true }),
  poVarianceNotes: text('po_variance_notes'),
  orderValue: numeric('order_value', { precision: 14, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  depositPercent: numeric('deposit_percent', { precision: 5, scale: 2 }),
  depositReceivedAt: timestamp('deposit_received_at', { withTimezone: true }),
  depositReceivedAmount: numeric('deposit_received_amount', { precision: 14, scale: 2 }),
  contractualDeliveryDate: date('contractual_delivery_date'),
  documentId: uuid('document_id').references(() => documents.id),
}, (table) => [
  uniqueIndex('orders_deal_unique').on(table.dealId),
  uniqueIndex('orders_pi_number_unique').on(table.piNumber),
]);

export const workOrders = pgTable('work_orders', {
  ...auditColumns,
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  miNumber: text('mi_number').notNull(),
  batchNumber: text('batch_number'),
  issuedAt: timestamp('issued_at', { withTimezone: true }),
  plannedStart: date('planned_start'),
  plannedFinish: date('planned_finish'),
  actualFinish: date('actual_finish'),
  productionStatus: text('production_status'),
  isProvisional: boolean('is_provisional').default(false).notNull(),
  provisionalHoldStage: text('provisional_hold_stage'),
  documentId: uuid('document_id').references(() => documents.id),
}, (table) => [
  uniqueIndex('work_orders_order_unique').on(table.orderId),
  uniqueIndex('work_orders_mi_number_unique').on(table.miNumber),
]);

export const specSheets = pgTable('spec_sheets', {
  ...auditColumns,
  workOrderId: uuid('work_order_id').references(() => workOrders.id).notNull(),
  revision: integer('revision').notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }),
  supersededAt: timestamp('superseded_at', { withTimezone: true }),
  documentId: uuid('document_id').references(() => documents.id),
}, (table) => [uniqueIndex('spec_sheets_work_order_revision_unique').on(table.workOrderId, table.revision)]);

export const specSheetLines = pgTable('spec_sheet_lines', {
  ...auditColumns,
  specSheetId: uuid('spec_sheet_id').references(() => specSheets.id).notNull(),
  specCategoryId: uuid('spec_category_id').references(() => specCategories.id).notNull(),
  valueEn: text('value_en').notNull(),
  valueZh: text('value_zh').notNull(),
  sortOrder: integer('sort_order').notNull(),
}, (table) => [uniqueIndex('spec_sheet_lines_category_unique').on(table.specSheetId, table.specCategoryId)]);

export const specSheetDistributions = pgTable('spec_sheet_distributions', {
  ...auditColumns,
  specSheetId: uuid('spec_sheet_id').references(() => specSheets.id).notNull(),
  department: text('department').notNull(),
  distributedAt: timestamp('distributed_at', { withTimezone: true }),
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
}, (table) => [uniqueIndex('spec_sheet_distributions_department_unique').on(table.specSheetId, table.department)]);

export const attachments = pgTable('attachments', {
  ...auditColumns,
  dealId: uuid('deal_id').references(() => deals.id).notNull(),
  group: attachmentGroupEnum('group').notNull(),
  kind: attachmentKindEnum('kind').notNull(),
  specSheetId: uuid('spec_sheet_id').references(() => specSheets.id),
  fileUrl: text('file_url').notNull(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type'),
  fileBase64: text('file_base64'),
  uploadedBy: uuid('uploaded_by').references(() => users.id).notNull(),
}, (table) => [
  index('attachments_deal_group_idx').on(table.dealId, table.group),
  index('attachments_spec_sheet_idx').on(table.specSheetId),
]);
