import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import {
  deals, documents, fatRecords, machineModels, machines, orders, partners,
  shipmentBookingAttempts, shipmentExportDocuments, shipments, users, workOrders,
} from '@/db/schema';
import { renderA4Pdf } from '@/documents/pdf';
import { renderShippingNoticeHtml, renderShippingOrderHtml, type ShippingDocument } from '@/documents/templates/shipping';
import { requireRole } from '@/lib/authorization';
import { bookingDelayCauses } from '@/db/enums';
import { dateUtc } from '@/features/production/dates';

const exportKinds = ['commercial_invoice', 'packing_list', 'certificate_of_origin'] as const;
export type ExportKind = typeof exportKinds[number];

export async function getLogisticsState(shipmentId: string) {
  await requireRole('admin', 'manager', 'sales', 'logistics', 'finance', 'service', 'viewer');
  const db = getDb();
  const [attempts, exports] = await Promise.all([
    db.select().from(shipmentBookingAttempts).where(eq(shipmentBookingAttempts.shipmentId, shipmentId))
      .orderBy(shipmentBookingAttempts.attemptNumber),
    db.select({ id: shipmentExportDocuments.id, kind: shipmentExportDocuments.kind,
      filename: shipmentExportDocuments.filename }).from(shipmentExportDocuments)
      .where(eq(shipmentExportDocuments.shipmentId, shipmentId)),
  ]);
  return { attempts, exports };
}

export async function notifyCompletion(shipmentId: string, actualFinish: string) {
  const actor = await requireRole('admin', 'manager', 'logistics');
  dateUtc(actualFinish);
  return getDb().transaction(async (tx) => {
    const [shipment] = await tx.select().from(shipments).where(eq(shipments.id, shipmentId)).for('update').limit(1);
    if (!shipment || shipment.completionNotifiedAt) throw new Error('Completion has already been notified');
    const [work] = await tx.select().from(workOrders).where(eq(workOrders.orderId, shipment.orderId)).limit(1);
    if (!work?.issuedAt) throw new Error('Issue the MI before completion notification');
    const fat = await tx.select({ id: fatRecords.id }).from(fatRecords)
      .where(and(eq(fatRecords.workOrderId, work.id), eq(fatRecords.outcome, 'passed'))).limit(1);
    if (!fat.length) throw new Error('Pass FAT before notifying logistics that the machine is complete');
    const now = new Date();
    await tx.update(workOrders).set({ actualFinish, updatedAt: now, updatedBy: actor.id }).where(eq(workOrders.id, work.id));
    await tx.update(shipments).set({ completionNotifiedAt: now, updatedAt: now, updatedBy: actor.id })
      .where(eq(shipments.id, shipmentId));
  });
}

export async function requestBooking(shipmentId: string) {
  const actor = await requireRole('admin', 'manager', 'logistics');
  return getDb().transaction(async (tx) => {
    const [shipment] = await tx.select().from(shipments).where(eq(shipments.id, shipmentId)).for('update').limit(1);
    if (!shipment?.completionNotifiedAt) throw new Error('Record E0 completion notification before booking');
    if (!shipment.finalPaymentReceivedAt) throw new Error('G5: Final payment is required before booking');
    if (shipment.bookingConfirmedAt) throw new Error('Space is already confirmed');
    const [latest] = await tx.select().from(shipmentBookingAttempts).where(eq(shipmentBookingAttempts.shipmentId, shipmentId))
      .orderBy(desc(shipmentBookingAttempts.attemptNumber)).limit(1);
    if (latest && !latest.rejectedAt) throw new Error('The current booking request is still awaiting confirmation');
    const now = new Date();
    const attemptNumber = shipment.bookingAttempts + 1;
    await tx.insert(shipmentBookingAttempts).values({ shipmentId, attemptNumber, requestedAt: now,
      createdBy: actor.id, updatedBy: actor.id });
    await tx.update(shipments).set({ bookingRequestedAt: now, bookingAttempts: attemptNumber,
      updatedAt: now, updatedBy: actor.id }).where(eq(shipments.id, shipmentId));
  });
}

export async function rejectBooking(shipmentId: string, reason: string) {
  const actor = await requireRole('admin', 'manager', 'logistics');
  if (!reason.trim()) throw new Error('Record why this booking request failed');
  return getDb().transaction(async (tx) => {
    const [shipment] = await tx.select().from(shipments).where(eq(shipments.id, shipmentId)).for('update').limit(1);
    if (!shipment || shipment.bookingConfirmedAt) throw new Error('Confirmed booking cannot be rejected');
    const [latest] = await tx.select().from(shipmentBookingAttempts).where(eq(shipmentBookingAttempts.shipmentId, shipmentId))
      .orderBy(desc(shipmentBookingAttempts.attemptNumber)).limit(1);
    if (!latest || latest.rejectedAt || latest.confirmedAt) throw new Error('No open booking request to reject');
    await tx.update(shipmentBookingAttempts).set({ rejectedAt: new Date(), rejectionReason: reason.trim(),
      updatedAt: new Date(), updatedBy: actor.id }).where(eq(shipmentBookingAttempts.id, latest.id));
  });
}

export async function confirmBooking(shipmentId: string, input: {
  bookingReference: string; vesselOrFlight: string; etd: string; eta: string;
  delayCause?: typeof bookingDelayCauses[number] | null;
}) {
  const actor = await requireRole('admin', 'manager', 'logistics');
  dateUtc(input.etd); dateUtc(input.eta);
  if (!input.bookingReference.trim()) throw new Error('G14: Booking reference is required for space confirmation');
  if (!input.vesselOrFlight.trim()) throw new Error('Name the vessel or flight before confirmation');
  if (input.eta < input.etd) throw new Error('Arrival estimate must follow departure');
  return getDb().transaction(async (tx) => {
    const [shipment] = await tx.select().from(shipments).where(eq(shipments.id, shipmentId)).for('update').limit(1);
    if (!shipment?.bookingRequestedAt || shipment.bookingConfirmedAt) throw new Error('Request booking before confirmation');
    const [latest] = await tx.select().from(shipmentBookingAttempts).where(eq(shipmentBookingAttempts.shipmentId, shipmentId))
      .orderBy(desc(shipmentBookingAttempts.attemptNumber)).limit(1);
    if (!latest || latest.rejectedAt || latest.confirmedAt) throw new Error('No open booking attempt');
    const now = new Date();
    const late = Boolean(shipment.bookingDueBy && now.toISOString().slice(0, 10) > shipment.bookingDueBy);
    if (late && !input.delayCause && !shipment.bookingDelayCause) throw new Error('Record the booking delay cause before confirming late space');
    await tx.update(shipmentBookingAttempts).set({ confirmedAt: now, bookingReference: input.bookingReference.trim(),
      updatedAt: now, updatedBy: actor.id }).where(eq(shipmentBookingAttempts.id, latest.id));
    await tx.update(shipments).set({ bookingConfirmedAt: now, bookingReference: input.bookingReference.trim(),
      vesselOrFlight: input.vesselOrFlight.trim(), etd: input.etd, eta: input.eta,
      bookingDelayCause: late ? input.delayCause ?? shipment.bookingDelayCause : null,
      updatedAt: now, updatedBy: actor.id }).where(eq(shipments.id, shipmentId));
  });
}

export async function recordBookingDelayCause(shipmentId: string, cause: typeof bookingDelayCauses[number]) {
  const actor = await requireRole('admin', 'manager', 'logistics');
  if (!bookingDelayCauses.includes(cause)) throw new Error('Choose a valid booking delay cause');
  const [shipment] = await getDb().select().from(shipments).where(eq(shipments.id, shipmentId)).limit(1);
  if (!shipment?.bookingDueBy || (shipment.bookingConfirmedAt
    ? shipment.bookingConfirmedAt.toISOString().slice(0, 10) <= shipment.bookingDueBy
    : new Date().toISOString().slice(0, 10) <= shipment.bookingDueBy)) {
    throw new Error('The shipment has no late or overdue booking');
  }
  await getDb().update(shipments).set({ bookingDelayCause: cause, updatedAt: new Date(), updatedBy: actor.id })
    .where(eq(shipments.id, shipmentId));
}

export async function uploadExportDocument(shipmentId: string, kind: ExportKind, filename: string, bytes: Uint8Array) {
  const actor = await requireRole('admin', 'manager', 'logistics');
  if (!exportKinds.includes(kind)) throw new Error('Choose an export document type');
  if (bytes.length < 100 || bytes.length > 10_000_000 || Buffer.from(bytes.subarray(0, 5)).toString() !== '%PDF-') {
    throw new Error('Upload a PDF up to 10 MB');
  }
  return getDb().transaction(async (tx) => {
    const [shipment] = await tx.select().from(shipments).where(eq(shipments.id, shipmentId)).for('update').limit(1);
    if (!shipment?.bookingConfirmedAt || shipment.shippedAt) throw new Error('Confirm space before preparing export documents');
    await tx.insert(shipmentExportDocuments).values({ shipmentId, kind,
      filename: filename.trim() || `${kind}.pdf`, mimeType: 'application/pdf',
      fileBase64: Buffer.from(bytes).toString('base64'), createdBy: actor.id, updatedBy: actor.id,
    }).onConflictDoUpdate({ target: [shipmentExportDocuments.shipmentId, shipmentExportDocuments.kind],
      set: { filename: filename.trim() || `${kind}.pdf`, fileBase64: Buffer.from(bytes).toString('base64'),
        updatedAt: new Date(), updatedBy: actor.id } });
    const docs = await tx.select({ kind: shipmentExportDocuments.kind }).from(shipmentExportDocuments)
      .where(eq(shipmentExportDocuments.shipmentId, shipmentId));
    if (exportKinds.every((required) => docs.some((doc) => doc.kind === required))) {
      await tx.update(shipments).set({ exportDocumentsPreparedAt: new Date(), updatedAt: new Date(), updatedBy: actor.id })
        .where(eq(shipments.id, shipmentId));
    }
  });
}

async function shippingData(shipmentId: string): Promise<ShippingDocument & { dealId: string }> {
  const [row] = await getDb().select({ shipment: shipments, order: orders, deal: deals,
    partner: partners, model: machineModels, preparer: users, serialNumber: machines.serialNumber,
  }).from(shipments).innerJoin(orders, eq(orders.id, shipments.orderId))
    .innerJoin(deals, eq(deals.id, orders.dealId)).innerJoin(partners, eq(partners.id, deals.partnerId))
    .leftJoin(machineModels, eq(machineModels.id, deals.machineModelId))
    .leftJoin(machines, eq(machines.orderId, orders.id))
    .innerJoin(users, eq(users.id, shipments.createdBy))
    .where(eq(shipments.id, shipmentId)).limit(1);
  if (!row?.shipment.bookingConfirmedAt || !row.shipment.bookingReference || !row.shipment.vesselOrFlight
    || !row.shipment.etd || !row.shipment.eta || !row.shipment.grossWeightKg
    || !row.shipment.packageLengthMm || !row.shipment.packageWidthMm || !row.shipment.packageHeightMm) {
    throw new Error('Complete booking and package details before generating shipping documents');
  }
  return { dealId: row.deal.id, dealNumber: row.deal.dealNumber, piNumber: row.order.piNumber,
    partnerName: row.partner.name, modelCode: row.model?.code ?? '', serialNumber: row.serialNumber,
    forwarderName: row.shipment.forwarderName, vesselOrFlight: row.shipment.vesselOrFlight,
    bookingReference: row.shipment.bookingReference, etd: row.shipment.etd, eta: row.shipment.eta,
    incoterm: row.shipment.incoterm ?? '', packageLengthMm: row.shipment.packageLengthMm,
    packageWidthMm: row.shipment.packageWidthMm, packageHeightMm: row.shipment.packageHeightMm,
    grossWeightKg: row.shipment.grossWeightKg, billOfLadingRef: row.shipment.billOfLadingRef,
    preparedBy: row.preparer.name,
  };
}

export async function issueShippingNotice(shipmentId: string) {
  const actor = await requireRole('admin', 'manager', 'logistics');
  const data = await shippingData(shipmentId); // G15 requires confirmed space, vessel and package.
  const now = new Date();
  const pdf = await renderA4Pdf(renderShippingNoticeHtml(data), {
    dealNumber: data.dealNumber, revision: 1, issueDate: now.toISOString().slice(0, 10),
  });
  return getDb().transaction(async (tx) => {
    const [shipment] = await tx.select().from(shipments).where(eq(shipments.id, shipmentId)).for('update').limit(1);
    if (!shipment?.bookingConfirmedAt || shipment.shippingNoticeDocumentId) throw new Error('G15: Confirm space before issuing notice');
    const [document] = await tx.insert(documents).values({ dealId: data.dealId, docType: 'shipping_notice',
      docNumber: `SN-${data.piNumber}`, revision: 1, language: 'en', status: 'issued',
      pdfUrl: 'pending', pdfBase64: Buffer.from(pdf).toString('base64'), generatedAt: now,
      createdBy: actor.id, updatedBy: actor.id }).returning({ id: documents.id });
    await tx.update(documents).set({ pdfUrl: `/api/documents/${document!.id}/pdf` }).where(eq(documents.id, document!.id));
    await tx.update(shipments).set({ shippingNoticeDocumentId: document!.id, updatedAt: now, updatedBy: actor.id })
      .where(eq(shipments.id, shipmentId));
    return document!.id;
  });
}

export async function recordShippingNoticeSent(shipmentId: string) {
  const actor = await requireRole('admin', 'manager', 'logistics');
  return getDb().transaction(async (tx) => {
    const [shipment] = await tx.select().from(shipments).where(eq(shipments.id, shipmentId)).for('update').limit(1);
    if (!shipment?.shippingNoticeDocumentId || shipment.shippingNoticeSentAt) {
      throw new Error('Issue the shipping notice PDF before recording dispatch');
    }
    await tx.update(shipments).set({ shippingNoticeSentAt: new Date(), updatedAt: new Date(), updatedBy: actor.id })
      .where(eq(shipments.id, shipmentId));
  });
}

export async function issueShippingOrder(shipmentId: string, serialNumber: string) {
  const actor = await requireRole('admin', 'manager', 'logistics');
  if (!serialNumber.trim()) throw new Error('Record the machine serial number on 出貨單');
  const data = await shippingData(shipmentId);
  if (!data.forwarderName) throw new Error('Record the forwarder before issuing 出貨單');
  data.serialNumber = serialNumber.trim();
  const now = new Date();
  const pdf = await renderA4Pdf(await renderShippingOrderHtml(data), {
    dealNumber: data.dealNumber, revision: 1, issueDate: now.toISOString().slice(0, 10),
  });
  return getDb().transaction(async (tx) => {
    const [shipment] = await tx.select().from(shipments).where(eq(shipments.id, shipmentId)).for('update').limit(1);
    if (!shipment?.finalPaymentReceivedAt || !shipment.exportDocumentsPreparedAt || !shipment.shippingNoticeSentAt) {
      throw new Error('G16: Final payment, notice and all export documents are required before 出貨單');
    }
    if (shipment.shippingOrderDocumentId || shipment.shippedAt) throw new Error('Shipping order already issued or machine shipped');
    const [document] = await tx.insert(documents).values({ dealId: data.dealId, docType: 'shipping_order',
      docNumber: `SO-${data.piNumber}`, revision: 1, language: 'zh_hant', status: 'issued',
      pdfUrl: 'pending', pdfBase64: Buffer.from(pdf).toString('base64'), generatedAt: now,
      createdBy: actor.id, updatedBy: actor.id }).returning({ id: documents.id });
    await tx.update(documents).set({ pdfUrl: `/api/documents/${document!.id}/pdf` }).where(eq(documents.id, document!.id));
    await tx.update(shipments).set({ shippingOrderDocumentId: document!.id,
      plannedSerialNumber: serialNumber.trim(), updatedAt: now, updatedBy: actor.id })
      .where(eq(shipments.id, shipmentId));
    return document!.id;
  });
}

export async function recordShippingOrderPrinted(shipmentId: string) {
  const actor = await requireRole('admin', 'manager', 'logistics');
  return getDb().transaction(async (tx) => {
    const [shipment] = await tx.select().from(shipments).where(eq(shipments.id, shipmentId)).for('update').limit(1);
    if (!shipment?.shippingOrderDocumentId || shipment.shippingOrderPrintedAt) throw new Error('Issue 出貨單 before recording a printed copy');
    const now = new Date();
    await tx.update(documents).set({ status: 'printed', printedAt: now, updatedAt: now, updatedBy: actor.id })
      .where(eq(documents.id, shipment.shippingOrderDocumentId));
    await tx.update(shipments).set({ shippingOrderPrintedAt: now, updatedAt: now, updatedBy: actor.id })
      .where(eq(shipments.id, shipmentId));
  });
}

export async function loadShipmentDocument(documentId: string) {
  await requireRole('admin', 'manager', 'sales', 'logistics', 'finance', 'service', 'viewer');
  const [document] = await getDb().select().from(documents).where(eq(documents.id, documentId)).limit(1);
  if (!document || !['shipping_notice', 'shipping_order'].includes(document.docType)) throw new Error('Shipping document not found');
  return document;
}
