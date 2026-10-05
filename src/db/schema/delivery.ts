import { sql } from 'drizzle-orm';
import { boolean, check, date, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { attributionEnum, bookingDelayCauseEnum, capturePointEnum, delayReasonEnum, escalationLevelEnum, fatOutcomeEnum, forwarderNominatorEnum, incotermEnum, visitTypeEnum } from '../enums';
import { auditColumns } from './common';
import { customers, partners } from './channel';
import { machineModels, specCategories } from './catalog';
import { documents, orders, workOrders } from './manufacturing';

export const progressReviews = pgTable('progress_reviews', {
  ...auditColumns,
  workOrderId: uuid('work_order_id').references(() => workOrders.id).notNull(),
  sequence: integer('sequence').notNull(),
  dueDate: date('due_date').notNull(),
  filledAt: timestamp('filled_at', { withTimezone: true }),
  reportedStage: text('reported_stage'),
  expectedCompletion: date('expected_completion'),
  previousExpected: date('previous_expected'),
  deltaDays: integer('delta_days'),
  cumulativeSlipDays: integer('cumulative_slip_days'),
  delayReason: delayReasonEnum('delay_reason'),
  attribution: attributionEnum('attribution'),
  reportedBy: text('reported_by'),
  escalationLevel: escalationLevelEnum('escalation_level').default('none').notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
}, (t) => [uniqueIndex('progress_reviews_work_sequence_unique').on(t.workOrderId, t.sequence), index('progress_reviews_due_idx').on(t.dueDate)]);

export const fatRecords = pgTable('fat_records', {
  ...auditColumns,
  workOrderId: uuid('work_order_id').references(() => workOrders.id).notNull(),
  scheduledFor: date('scheduled_for'),
  conductedAt: date('conducted_at'),
  outcome: fatOutcomeEnum('outcome'),
  punchList: jsonb('punch_list').$type<string[]>().default([]).notNull(),
  attendees: text('attendees'),
  customerContactCaptured: boolean('customer_contact_captured').default(false).notNull(),
  reportDocumentId: uuid('report_document_id').references(() => documents.id),
}, (t) => [index('fat_records_work_idx').on(t.workOrderId)]);

export const fatChecklistItems = pgTable('fat_checklist_items', {
  ...auditColumns,
  fatRecordId: uuid('fat_record_id').references(() => fatRecords.id).notNull(),
  specCategoryId: uuid('spec_category_id').references(() => specCategories.id).notNull(),
  expectedValue: text('expected_value').notNull(),
  verified: boolean('verified'),
  notes: text('notes'),
}, (t) => [uniqueIndex('fat_checklist_record_category_unique').on(t.fatRecordId, t.specCategoryId)]);

export const shipments = pgTable('shipments', {
  ...auditColumns,
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  finalPaymentReceivedAt: timestamp('final_payment_received_at', { withTimezone: true }),
  finalPaymentReceivedAmount: numeric('final_payment_received_amount', { precision: 14, scale: 2 }),
  forwarderName: text('forwarder_name'),
  packageLengthMm: integer('package_length_mm'),
  packageWidthMm: integer('package_width_mm'),
  packageHeightMm: integer('package_height_mm'),
  grossWeightKg: numeric('gross_weight_kg', { precision: 10, scale: 2 }),
  requiresShippingMark: boolean('requires_shipping_mark'),
  shippedAt: timestamp('shipped_at', { withTimezone: true }),
  arrivedAt: timestamp('arrived_at', { withTimezone: true }),
  billOfLadingRef: text('bill_of_lading_ref'),
  completionNotifiedAt: timestamp('completion_notified_at', { withTimezone: true }),
  bookingRequestedAt: timestamp('booking_requested_at', { withTimezone: true }),
  bookingConfirmedAt: timestamp('booking_confirmed_at', { withTimezone: true }),
  bookingAttempts: integer('booking_attempts').default(0).notNull(),
  bookingReference: text('booking_reference'),
  vesselOrFlight: text('vessel_or_flight'),
  etd: date('etd'),
  eta: date('eta'),
  shippingNoticeSentAt: timestamp('shipping_notice_sent_at', { withTimezone: true }),
  exportDocumentsPreparedAt: timestamp('export_documents_prepared_at', { withTimezone: true }),
  shippingOrderPrintedAt: timestamp('shipping_order_printed_at', { withTimezone: true }),
  shippingNoticeDocumentId: uuid('shipping_notice_document_id').references(() => documents.id),
  shippingOrderDocumentId: uuid('shipping_order_document_id').references(() => documents.id),
  plannedSerialNumber: text('planned_serial_number'),
  forwarderNominatedBy: forwarderNominatorEnum('forwarder_nominated_by'),
  incoterm: incotermEnum('incoterm'),
  freightCost: numeric('freight_cost', { precision: 14, scale: 2 }),
  bookingDueBy: date('booking_due_by'),
  bookingDelayCause: bookingDelayCauseEnum('booking_delay_cause'),
}, (t) => [uniqueIndex('shipments_order_unique').on(t.orderId)]);

export const shipmentBookingAttempts = pgTable('shipment_booking_attempts', {
  ...auditColumns,
  shipmentId: uuid('shipment_id').references(() => shipments.id).notNull(),
  attemptNumber: integer('attempt_number').notNull(),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull(),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  bookingReference: text('booking_reference'),
}, (t) => [uniqueIndex('shipment_booking_attempt_number_unique').on(t.shipmentId, t.attemptNumber)]);

export const shipmentExportDocuments = pgTable('shipment_export_documents', {
  ...auditColumns,
  shipmentId: uuid('shipment_id').references(() => shipments.id).notNull(),
  kind: text('kind').notNull(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  fileBase64: text('file_base64').notNull(),
}, (t) => [uniqueIndex('shipment_export_kind_unique').on(t.shipmentId, t.kind)]);

export const machines = pgTable('machines', {
  ...auditColumns,
  serialNumber: text('serial_number').notNull(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  machineModelId: uuid('machine_model_id').references(() => machineModels.id).notNull(),
  partnerId: uuid('partner_id').references(() => partners.id).notNull(),
  customerId: uuid('customer_id').references(() => customers.id),
  installedAt: date('installed_at'),
  acceptedAt: date('accepted_at'),
  warrantyMonths: integer('warranty_months'),
  warrantyExpiresAt: date('warranty_expires_at'),
}, (t) => [uniqueIndex('machines_serial_unique').on(t.serialNumber), uniqueIndex('machines_order_unique').on(t.orderId)]);

export const siteVisits = pgTable('site_visits', {
  ...auditColumns,
  machineId: uuid('machine_id').references(() => machines.id).notNull(),
  visitType: visitTypeEnum('visit_type').notNull(),
  visitedAt: date('visited_at').notNull(),
  engineer: text('engineer').notNull(),
  workPerformed: text('work_performed'),
  acknowledgedBy: text('acknowledged_by'),
  closedAt: timestamp('closed_at', { withTimezone: true }),
}, (t) => [index('site_visits_machine_idx').on(t.machineId)]);

export const conditionPhotos = pgTable('condition_photos', {
  ...auditColumns,
  machineId: uuid('machine_id').references(() => machines.id),
  shipmentId: uuid('shipment_id').references(() => shipments.id),
  siteVisitId: uuid('site_visit_id').references(() => siteVisits.id),
  capturePoint: capturePointEnum('capture_point').notNull(),
  capturedAt: timestamp('captured_at', { withTimezone: true }).notNull(),
  fileUrl: text('file_url').notNull(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  fileBase64: text('file_base64').notNull(),
  caption: text('caption'),
}, (t) => [index('condition_photos_machine_visit_idx').on(t.machineId, t.siteVisitId),
  index('condition_photos_shipment_idx').on(t.shipmentId),
  check('condition_photos_owner_check', sql`${t.machineId} IS NOT NULL OR ${t.shipmentId} IS NOT NULL`)]);
