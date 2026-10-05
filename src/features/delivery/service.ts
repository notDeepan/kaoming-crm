import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import {
  commissions, conditionPhotos, deals, fatRecords, machines, orders, quotations, shipments, siteVisits, workOrders,
} from '@/db/schema';
import { requireRole } from '@/lib/authorization';
import { minorUnitsToDecimal, parseDecimalToMinorUnits } from '@/lib/money';
import { addDays, dateUtc, requiresShippingMark, warrantyEnd } from '@/features/production/dates';

type VisitType = typeof import('@/db/enums').visitTypes[number];
type CapturePoint = typeof import('@/db/enums').capturePoints[number];

export async function getDeliveryState(orderId: string) {
  await requireRole('admin', 'manager', 'sales', 'logistics', 'finance', 'service', 'viewer');
  const db = getDb();
  const [shipment] = await db.select().from(shipments).where(eq(shipments.orderId, orderId)).limit(1);
  const [machine] = await db.select().from(machines).where(eq(machines.orderId, orderId)).limit(1);
  const visits = machine ? await db.select().from(siteVisits).where(eq(siteVisits.machineId, machine.id)) : [];
  const photos = machine ? await db.select().from(conditionPhotos).where(eq(conditionPhotos.machineId, machine.id)) : [];
  const shipmentPhotos = shipment ? await db.select().from(conditionPhotos)
    .where(eq(conditionPhotos.shipmentId, shipment.id)) : [];
  return { shipment: shipment ?? null, machine: machine ?? null, visits, photos, shipmentPhotos };
}

export async function prepareShipment(orderId: string) {
  const actor = await requireRole('admin', 'manager', 'logistics');
  return getDb().transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update').limit(1);
    if (!order) throw new Error('Order not found');
    const [existing] = await tx.select().from(shipments).where(eq(shipments.orderId, orderId)).limit(1);
    if (existing) return existing;
    const [quote] = await tx.select({ incoterm: quotations.incoterm }).from(quotations)
      .where(eq(quotations.id, order.sourceQuotationId)).limit(1);
    const incoterm = quote?.incoterm ?? 'FOB';
    const [shipment] = await tx.insert(shipments).values({ orderId, incoterm,
      forwarderNominatedBy: incoterm === 'CIF' ? 'kao_ming' : incoterm === 'FOB' ? 'customer' : null,
      bookingDueBy: order.contractualDeliveryDate ? addDays(order.contractualDeliveryDate, -21) : null,
      createdBy: actor.id, updatedBy: actor.id }).returning();
    return shipment!;
  });
}

export async function recordFinalPayment(shipmentId: string, amount?: string) {
  const actor = await requireRole('admin', 'manager', 'finance');
  await getDb().transaction(async (tx) => {
    const [shipment] = await tx.select().from(shipments).where(eq(shipments.id, shipmentId)).for('update').limit(1);
    if (!shipment || shipment.finalPaymentReceivedAt) throw new Error('Shipment not found or final payment already recorded');
    const [order] = await tx.select().from(orders).where(eq(orders.id, shipment.orderId)).limit(1);
    if (!order) throw new Error('Order not found');
    const minor = amount ? parseDecimalToMinorUnits(amount) : null;
    if (minor !== null && (minor <= 0n || minor > parseDecimalToMinorUnits(order.orderValue))) {
      throw new Error('Final payment amount must be positive and no more than the order value');
    }
    const now = new Date();
    await tx.update(shipments).set({ finalPaymentReceivedAt: now,
      finalPaymentReceivedAmount: minor === null ? null : minorUnitsToDecimal(minor),
      updatedAt: now, updatedBy: actor.id }).where(eq(shipments.id, shipmentId));
    await tx.update(deals).set({ projectStage: 'final_payment_received', updatedAt: now, updatedBy: actor.id })
      .where(eq(deals.id, order.dealId));
  });
}

export async function recordPackage(shipmentId: string, input: {
  forwarderName: string; lengthMm: number; widthMm: number; heightMm: number; grossWeightKg: number;
}) {
  const actor = await requireRole('admin', 'manager', 'logistics');
  const dimensions = [input.lengthMm, input.widthMm, input.heightMm];
  if (dimensions.some((n) => !Number.isInteger(n) || n <= 0) || !Number.isFinite(input.grossWeightKg) || input.grossWeightKg <= 0) {
    throw new Error('Enter positive package dimensions and weight');
  }
  const [row] = await getDb().update(shipments).set({
    forwarderName: input.forwarderName.trim() || null,
    packageLengthMm: input.lengthMm, packageWidthMm: input.widthMm, packageHeightMm: input.heightMm,
    grossWeightKg: input.grossWeightKg.toFixed(2),
    requiresShippingMark: requiresShippingMark(input.grossWeightKg, dimensions),
    updatedAt: new Date(), updatedBy: actor.id,
  }).where(and(eq(shipments.id, shipmentId), isNull(shipments.shippedAt))).returning();
  if (!row) throw new Error('Package details cannot change after shipment');
}

export async function markShipped(shipmentId: string, serialNumber: string, billOfLadingRef: string) {
  const actor = await requireRole('admin', 'manager', 'logistics');
  if (!serialNumber.trim() || !billOfLadingRef.trim()) throw new Error('Serial number and bill of lading are required');
  return getDb().transaction(async (tx) => {
    const [shipment] = await tx.select().from(shipments).where(eq(shipments.id, shipmentId)).for('update').limit(1);
    if (!shipment || shipment.shippedAt) throw new Error('Shipment not found or already shipped');
    if (!shipment.finalPaymentReceivedAt) throw new Error('Record final payment before shipping');
    if (!shipment.shippingOrderPrintedAt) throw new Error('Print 出貨單 after confirming space and export documents before shipment');
    if (shipment.plannedSerialNumber !== serialNumber.trim()) throw new Error('Machine serial must match the printed 出貨單');
    if (!shipment.grossWeightKg || !shipment.packageLengthMm || !shipment.packageWidthMm || !shipment.packageHeightMm) {
      throw new Error('Record package dimensions and weight before shipping');
    }
    const [order] = await tx.select().from(orders).where(eq(orders.id, shipment.orderId)).limit(1);
    const [deal] = await tx.select().from(deals).where(eq(deals.id, order!.dealId)).limit(1);
    if (!deal?.machineModelId) throw new Error('Select a machine model for the order');
    const [work] = await tx.select().from(workOrders).where(eq(workOrders.orderId, order!.id)).limit(1);
    const passed = work ? await tx.select({ id: fatRecords.id }).from(fatRecords)
      .where(and(eq(fatRecords.workOrderId, work.id), eq(fatRecords.outcome, 'passed'))).limit(1) : [];
    if (!passed.length) throw new Error('FAT must pass before shipment');
    const [quote] = await tx.select({ warrantyMonths: quotations.warrantyMonths }).from(quotations)
      .where(eq(quotations.id, order!.sourceQuotationId)).limit(1);
    const now = new Date();
    const [machine] = await tx.insert(machines).values({ serialNumber: serialNumber.trim(), orderId: order!.id,
      machineModelId: deal.machineModelId, partnerId: deal.partnerId, customerId: deal.customerId,
      warrantyMonths: quote?.warrantyMonths ?? 12, createdBy: actor.id, updatedBy: actor.id,
    }).returning();
    await tx.update(shipments).set({ shippedAt: now, billOfLadingRef: billOfLadingRef.trim(), updatedAt: now, updatedBy: actor.id })
      .where(eq(shipments.id, shipmentId));
    await tx.update(conditionPhotos).set({ machineId: machine!.id, updatedAt: now, updatedBy: actor.id })
      .where(and(eq(conditionPhotos.shipmentId, shipmentId), isNull(conditionPhotos.machineId)));
    await tx.update(deals).set({ projectStage: 'shipped', updatedAt: now, updatedBy: actor.id }).where(eq(deals.id, deal.id));
    return machine!;
  });
}

export async function markArrived(shipmentId: string) {
  const actor = await requireRole('admin', 'manager', 'logistics');
  return getDb().transaction(async (tx) => {
    const [shipment] = await tx.select().from(shipments).where(eq(shipments.id, shipmentId)).for('update').limit(1);
    if (!shipment?.shippedAt || shipment.arrivedAt) throw new Error('Shipment must be shipped and not yet arrived');
    const now = new Date();
    await tx.update(shipments).set({ arrivedAt: now, updatedAt: now, updatedBy: actor.id }).where(eq(shipments.id, shipmentId));
    const [order] = await tx.select().from(orders).where(eq(orders.id, shipment.orderId)).limit(1);
    await tx.update(deals).set({ projectStage: 'arrived', updatedAt: now, updatedBy: actor.id }).where(eq(deals.id, order!.dealId));
  });
}

export async function createSiteVisit(machineId: string, input: {
  visitType: VisitType; visitedAt: string; engineer: string; workPerformed: string;
}) {
  const actor = await requireRole('admin', 'manager', 'service');
  dateUtc(input.visitedAt);
  if (!input.engineer.trim()) throw new Error('Name the engineer');
  const [machine] = await getDb().select().from(machines).where(eq(machines.id, machineId)).limit(1);
  if (!machine) throw new Error('Machine not found');
  const [visit] = await getDb().insert(siteVisits).values({ machineId, visitType: input.visitType,
    visitedAt: input.visitedAt, engineer: input.engineer.trim(), workPerformed: input.workPerformed.trim() || null,
    createdBy: actor.id, updatedBy: actor.id,
  }).returning();
  return visit!;
}

export async function addConditionPhoto(machineId: string, visitId: string, input: {
  capturePoint: CapturePoint; filename: string; caption: string; bytes: Uint8Array;
}) {
  const actor = await requireRole('admin', 'manager', 'service');
  if (input.bytes.length < 100 || input.bytes.length > 10_000_000) throw new Error('Choose a PNG or JPEG up to 10 MB');
  const png = Buffer.from(input.bytes.subarray(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = input.bytes[0] === 0xff && input.bytes[1] === 0xd8 && input.bytes[2] === 0xff;
  if (!png && !jpeg) throw new Error('Condition photo must be PNG or JPEG');
  return getDb().transaction(async (tx) => {
    const [visit] = await tx.select().from(siteVisits).where(eq(siteVisits.id, visitId)).for('update').limit(1);
    if (!visit || visit.machineId !== machineId || visit.closedAt) throw new Error('Choose an open visit for this machine');
    if (input.capturePoint !== 'installation' && input.capturePoint !== 'service') {
      throw new Error('Visit photos must use the installation or service capture point');
    }
    const [photo] = await tx.insert(conditionPhotos).values({ machineId, siteVisitId: visitId,
      capturePoint: input.capturePoint, capturedAt: new Date(), fileUrl: 'pending',
      filename: input.filename.trim() || 'condition-photo', mimeType: png ? 'image/png' : 'image/jpeg',
      fileBase64: Buffer.from(input.bytes).toString('base64'), caption: input.caption.trim() || null,
      createdBy: actor.id, updatedBy: actor.id,
    }).returning();
    await tx.update(conditionPhotos).set({ fileUrl: `/api/condition-photos/${photo!.id}` }).where(eq(conditionPhotos.id, photo!.id));
    return photo!;
  });
}

export async function addShipmentConditionPhoto(shipmentId: string, input: {
  capturePoint: 'fat' | 'loading'; filename: string; caption: string; bytes: Uint8Array;
}) {
  const actor = await requireRole('admin', 'manager', 'logistics', 'service');
  if (input.bytes.length < 100 || input.bytes.length > 10_000_000) throw new Error('Choose a PNG or JPEG up to 10 MB');
  const png = Buffer.from(input.bytes.subarray(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = input.bytes[0] === 0xff && input.bytes[1] === 0xd8 && input.bytes[2] === 0xff;
  if (!png && !jpeg) throw new Error('Condition photo must be PNG or JPEG');
  const db = getDb();
  return db.transaction(async (tx) => {
    const [shipment] = await tx.select().from(shipments).where(eq(shipments.id, shipmentId)).for('update').limit(1);
    if (!shipment || shipment.shippedAt) throw new Error('Open a shipment before recording FAT or loading photos');
    const [photo] = await tx.insert(conditionPhotos).values({ shipmentId,
      capturePoint: input.capturePoint, capturedAt: new Date(), fileUrl: 'pending',
      filename: input.filename.trim() || 'condition-photo', mimeType: png ? 'image/png' : 'image/jpeg',
      fileBase64: Buffer.from(input.bytes).toString('base64'), caption: input.caption.trim() || null,
      createdBy: actor.id, updatedBy: actor.id,
    }).returning();
    await tx.update(conditionPhotos).set({ fileUrl: `/api/condition-photos/${photo!.id}` })
      .where(eq(conditionPhotos.id, photo!.id));
    return photo!;
  });
}

export async function closeSiteVisit(visitId: string, acknowledgedBy: string) {
  const actor = await requireRole('admin', 'manager', 'service');
  return getDb().transaction(async (tx) => {
    const [visit] = await tx.select().from(siteVisits).where(eq(siteVisits.id, visitId)).for('update').limit(1);
    if (!visit || visit.closedAt) throw new Error('Visit not found or already closed');
    const photos = await tx.select({ id: conditionPhotos.id }).from(conditionPhotos)
      .where(and(eq(conditionPhotos.siteVisitId, visitId), eq(conditionPhotos.machineId, visit.machineId))).limit(1);
    if (!photos.length) throw new Error('G10: Add a condition photo set before closing the site visit');
    await tx.update(siteVisits).set({ closedAt: new Date(), acknowledgedBy: acknowledgedBy.trim() || null,
      updatedAt: new Date(), updatedBy: actor.id }).where(eq(siteVisits.id, visitId));
    if (visit.visitType === 'installation') {
      const [machine] = await tx.select().from(machines).where(eq(machines.id, visit.machineId)).for('update').limit(1);
      if (machine && !machine.installedAt) {
        await tx.update(machines).set({ installedAt: visit.visitedAt, updatedAt: new Date(), updatedBy: actor.id })
          .where(eq(machines.id, visit.machineId));
      }
      const [order] = machine ? await tx.select().from(orders).where(eq(orders.id, machine.orderId)).limit(1) : [];
      if (order) await tx.update(deals).set({ projectStage: 'installation', updatedAt: new Date(), updatedBy: actor.id })
        .where(eq(deals.id, order.dealId));
    }
  });
}

export async function recordAcceptance(machineId: string, acceptedAt: string) {
  const actor = await requireRole('admin', 'manager', 'service');
  dateUtc(acceptedAt);
  return getDb().transaction(async (tx) => {
    const [machine] = await tx.select().from(machines).where(eq(machines.id, machineId)).for('update').limit(1);
    if (!machine || machine.acceptedAt) throw new Error('Machine not found or already accepted');
    const installation = await tx.select({ id: siteVisits.id }).from(siteVisits).where(and(
      eq(siteVisits.machineId, machineId), eq(siteVisits.visitType, 'installation'), isNull(siteVisits.closedAt)));
    if (installation.length) throw new Error('Close the installation visit with condition photos before acceptance');
    const completed = await tx.select({ id: siteVisits.id }).from(siteVisits).where(and(
      eq(siteVisits.machineId, machineId), eq(siteVisits.visitType, 'installation'))).limit(1);
    if (!completed.length) throw new Error('Record an installation visit before acceptance');
    if (!machine.installedAt || acceptedAt < machine.installedAt) throw new Error('Acceptance must be on or after installation');
    const [shipment] = await tx.select().from(shipments).where(eq(shipments.orderId, machine.orderId)).limit(1);
    if (!shipment?.arrivedAt) throw new Error('Record arrival before acceptance');
    await tx.update(machines).set({ acceptedAt,
      warrantyExpiresAt: warrantyEnd(acceptedAt, machine.warrantyMonths ?? 12),
      updatedAt: new Date(), updatedBy: actor.id }).where(eq(machines.id, machineId));
    const [order] = await tx.select().from(orders).where(eq(orders.id, machine.orderId)).limit(1);
    await tx.update(commissions).set({ becomesDueAt: acceptedAt, updatedAt: new Date(),
      updatedBy: actor.id }).where(eq(commissions.orderId, machine.orderId));
    await tx.update(deals).set({ projectStage: 'accepted', updatedAt: new Date(), updatedBy: actor.id })
      .where(eq(deals.id, order!.dealId));
  });
}
