'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { bookingDelayCauses } from '@/db/enums';
import {
  confirmBooking, issueShippingNotice, issueShippingOrder, notifyCompletion, recordShippingNoticeSent,
  recordShippingOrderPrinted, recordBookingDelayCause, rejectBooking, requestBooking, uploadExportDocument,
} from './service';

const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function run(dealId: string, work: () => Promise<unknown>, notice: string) {
  try { await work(); }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Logistics action failed';
    redirect(`/deals/${dealId}/delivery?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/deals/${dealId}/delivery`);
  revalidatePath('/shipments');
  redirect(`/deals/${dealId}/delivery?notice=${encodeURIComponent(notice)}`);
}

export async function notifyCompletionAction(form: FormData) {
  const dealId = uuid.parse(form.get('dealId'));
  await run(dealId, () => notifyCompletion(uuid.parse(form.get('shipmentId')),
    date.parse(form.get('actualFinish'))), 'E0 completion notification recorded');
}
export async function requestBookingAction(form: FormData) {
  const dealId = uuid.parse(form.get('dealId'));
  await run(dealId, () => requestBooking(uuid.parse(form.get('shipmentId'))), 'Booking request recorded');
}
export async function rejectBookingAction(form: FormData) {
  const dealId = uuid.parse(form.get('dealId'));
  await run(dealId, () => rejectBooking(uuid.parse(form.get('shipmentId')),
    z.string().trim().min(1).max(1000).parse(form.get('reason'))), 'Booking attempt rejected; a new attempt can be made');
}
export async function confirmBookingAction(form: FormData) {
  const dealId = uuid.parse(form.get('dealId'));
  await run(dealId, () => confirmBooking(uuid.parse(form.get('shipmentId')), {
    bookingReference: z.string().trim().max(200).parse(form.get('bookingReference')),
    vesselOrFlight: z.string().trim().min(1).max(200).parse(form.get('vesselOrFlight')),
    etd: date.parse(form.get('etd')), eta: date.parse(form.get('eta')),
    delayCause: z.enum(bookingDelayCauses).nullable().parse(form.get('delayCause') || null),
  }), 'Space confirmed');
}
export async function recordBookingDelayCauseAction(form: FormData) {
  const dealId = uuid.parse(form.get('dealId'));
  await run(dealId, () => recordBookingDelayCause(uuid.parse(form.get('shipmentId')),
    z.enum(bookingDelayCauses).parse(form.get('delayCause'))), 'Booking delay cause recorded');
}
export async function issueShippingNoticeAction(form: FormData) {
  const dealId = uuid.parse(form.get('dealId'));
  await run(dealId, () => issueShippingNotice(uuid.parse(form.get('shipmentId'))), 'Shipping notice PDF issued');
}
export async function recordShippingNoticeSentAction(form: FormData) {
  const dealId = uuid.parse(form.get('dealId'));
  await run(dealId, () => recordShippingNoticeSent(uuid.parse(form.get('shipmentId'))), 'Shipping notice dispatch recorded');
}
export async function uploadExportDocumentAction(form: FormData) {
  const dealId = uuid.parse(form.get('dealId'));
  await run(dealId, async () => {
    const file = form.get('document');
    if (!(file instanceof File)) throw new Error('Select a PDF');
    await uploadExportDocument(uuid.parse(form.get('shipmentId')),
      z.enum(['commercial_invoice', 'packing_list', 'certificate_of_origin']).parse(form.get('kind')),
      file.name, new Uint8Array(await file.arrayBuffer()));
  }, 'Export document recorded');
}
export async function issueShippingOrderAction(form: FormData) {
  const dealId = uuid.parse(form.get('dealId'));
  await run(dealId, () => issueShippingOrder(uuid.parse(form.get('shipmentId')),
    z.string().trim().min(1).max(100).parse(form.get('serialNumber'))), '出貨單 PDF issued');
}
export async function recordShippingOrderPrintedAction(form: FormData) {
  const dealId = uuid.parse(form.get('dealId'));
  await run(dealId, () => recordShippingOrderPrinted(uuid.parse(form.get('shipmentId'))), 'Printed 出貨單 recorded');
}
