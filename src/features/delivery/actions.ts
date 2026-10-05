'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { capturePoints, visitTypes } from '@/db/enums';
import {
  addConditionPhoto, addShipmentConditionPhoto, closeSiteVisit, createSiteVisit, markArrived, markShipped, prepareShipment,
  recordAcceptance, recordFinalPayment, recordPackage,
} from './service';

const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function run(dealId: string, work: () => Promise<unknown>, notice: string) {
  try { await work(); }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Delivery action failed';
    redirect(`/deals/${dealId}/delivery?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/deals/${dealId}/delivery`);
  redirect(`/deals/${dealId}/delivery?notice=${encodeURIComponent(notice)}`);
}

export async function prepareShipmentAction(form: FormData) {
  const dealId = uuid.parse(form.get('dealId'));
  await run(dealId, () => prepareShipment(uuid.parse(form.get('orderId'))), 'Shipment opened');
}
export async function recordFinalPaymentAction(form: FormData) {
  const dealId = uuid.parse(form.get('dealId'));
  await run(dealId, () => recordFinalPayment(uuid.parse(form.get('shipmentId')),
    z.string().regex(/^\d+(?:\.\d{1,2})?$/).parse(form.get('amount'))), 'Final payment recorded');
}
export async function recordPackageAction(form: FormData) {
  const dealId = uuid.parse(form.get('dealId'));
  await run(dealId, () => recordPackage(uuid.parse(form.get('shipmentId')), {
    forwarderName: z.string().trim().max(200).parse(form.get('forwarderName')),
    lengthMm: z.coerce.number().int().positive().parse(form.get('lengthMm')),
    widthMm: z.coerce.number().int().positive().parse(form.get('widthMm')),
    heightMm: z.coerce.number().int().positive().parse(form.get('heightMm')),
    grossWeightKg: z.coerce.number().positive().parse(form.get('grossWeightKg')),
  }), 'Package details recorded');
}
export async function markShippedAction(form: FormData) {
  const dealId = uuid.parse(form.get('dealId'));
  await run(dealId, () => markShipped(uuid.parse(form.get('shipmentId')),
    z.string().trim().min(1).max(100).parse(form.get('serialNumber')),
    z.string().trim().min(1).max(200).parse(form.get('billOfLadingRef'))), 'Machine shipped and installed-base record created');
}
export async function markArrivedAction(form: FormData) {
  const dealId = uuid.parse(form.get('dealId'));
  await run(dealId, () => markArrived(uuid.parse(form.get('shipmentId'))), 'Arrival recorded');
}
export async function createSiteVisitAction(form: FormData) {
  const dealId = uuid.parse(form.get('dealId'));
  await run(dealId, () => createSiteVisit(uuid.parse(form.get('machineId')), {
    visitType: z.enum(visitTypes).parse(form.get('visitType')),
    visitedAt: date.parse(form.get('visitedAt')),
    engineer: z.string().trim().min(1).max(200).parse(form.get('engineer')),
    workPerformed: z.string().trim().max(3000).parse(form.get('workPerformed')),
  }), 'Site visit opened');
}
export async function addConditionPhotoAction(form: FormData) {
  const dealId = uuid.parse(form.get('dealId'));
  await run(dealId, async () => {
    const file = form.get('photo');
    if (!(file instanceof File)) throw new Error('Choose a condition photo');
    await addConditionPhoto(uuid.parse(form.get('machineId')), uuid.parse(form.get('visitId')), {
      capturePoint: z.enum(capturePoints).parse(form.get('capturePoint')),
      filename: file.name, caption: z.string().trim().max(1000).parse(form.get('caption')),
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
  }, 'Condition photo added');
}
export async function addShipmentConditionPhotoAction(form: FormData) {
  const dealId = uuid.parse(form.get('dealId'));
  await run(dealId, async () => {
    const file = form.get('photo');
    if (!(file instanceof File)) throw new Error('Choose a condition photo');
    await addShipmentConditionPhoto(uuid.parse(form.get('shipmentId')), {
      capturePoint: z.enum(['fat', 'loading']).parse(form.get('capturePoint')),
      filename: file.name, caption: z.string().trim().max(1000).parse(form.get('caption')),
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
  }, 'Shipment condition photo added');
}
export async function closeSiteVisitAction(form: FormData) {
  const dealId = uuid.parse(form.get('dealId'));
  await run(dealId, () => closeSiteVisit(uuid.parse(form.get('visitId')),
    z.string().trim().max(200).parse(form.get('acknowledgedBy'))), 'Site visit closed');
}
export async function recordAcceptanceAction(form: FormData) {
  const dealId = uuid.parse(form.get('dealId'));
  await run(dealId, () => recordAcceptance(uuid.parse(form.get('machineId')),
    date.parse(form.get('acceptedAt'))), 'Acceptance and warranty start recorded');
}
