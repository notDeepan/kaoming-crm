'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { priceSources } from '@/db/enums';
import { approvePartsQuotation, checkStock, completePartsTerms, decideAlternative,
  draftPartsQuotation, identifyPart, issuePartsQuotation, openPartsRequest,
  recordPartPrice, requestIdentification, requestPricing, suggestAlternative } from './service';

const uuid = z.string().uuid();
async function run(requestId: string, work: () => Promise<unknown>, notice: string) {
  try { await work(); }
  catch (error) { redirect(`/aftermarket/${requestId}?error=${encodeURIComponent(error instanceof Error ? error.message : 'Parts action failed')}`); }
  revalidatePath(`/aftermarket/${requestId}`);
  redirect(`/aftermarket/${requestId}?notice=${encodeURIComponent(notice)}`);
}
export async function openPartsRequestAction(form: FormData) {
  try {
    const request = await openPartsRequest({
      partnerId: uuid.parse(form.get('partnerId')),
      machineId: form.get('machineId') ? uuid.parse(form.get('machineId')) : null,
      description: z.string().trim().min(1).max(5000).parse(form.get('description')),
      quantity: z.coerce.number().int().min(1).max(1000).parse(form.get('quantity')),
      linkedCaseId: form.get('linkedCaseId') ? uuid.parse(form.get('linkedCaseId')) : null,
    });
    revalidatePath('/aftermarket');
    redirect(`/aftermarket/${request.id}?notice=Request%20opened`);
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error) throw error;
    redirect(`/aftermarket?error=${encodeURIComponent(error instanceof Error ? error.message : 'Request could not be opened')}`);
  }
}
export async function requestIdentificationAction(form: FormData) {
  const id = uuid.parse(form.get('requestId'));
  await run(id, () => requestIdentification(id), 'Identification requested');
}
export async function identifyPartAction(form: FormData) {
  const id = uuid.parse(form.get('requestId'));
  await run(id, () => identifyPart(id, z.string().trim().min(1).max(200).parse(form.get('partNumber')),
    z.string().trim().min(1).max(200).parse(form.get('identifiedBy'))), 'Part identified');
}
export async function suggestAlternativeAction(form: FormData) {
  const id = uuid.parse(form.get('requestId'));
  await run(id, () => suggestAlternative(id, z.string().trim().min(1).max(200).parse(form.get('partNumber')),
    z.string().trim().min(1).max(200).parse(form.get('identifiedBy'))), 'Alternative suggested');
}
export async function decideAlternativeAction(form: FormData) {
  const id = uuid.parse(form.get('requestId'));
  await run(id, () => decideAlternative(id, form.get('accepted') === 'true',
    z.string().trim().max(1000).parse(form.get('reason') ?? '')), 'Alternative decision recorded');
}
export async function checkStockAction(form: FormData) {
  const id = uuid.parse(form.get('requestId'));
  const inStock = form.get('inStock') === 'true';
  await run(id, () => checkStock(id, inStock, inStock ? null :
    z.coerce.number().int().min(1).max(365).parse(form.get('leadDays'))), 'Stock checked');
}
export async function requestPricingAction(form: FormData) {
  const id = uuid.parse(form.get('requestId'));
  await run(id, () => requestPricing(id), 'Pricing requested');
}
export async function recordPartPriceAction(form: FormData) {
  const id = uuid.parse(form.get('requestId'));
  await run(id, () => recordPartPrice(id, {
    price: z.string().regex(/^\d+(?:\.\d{1,2})?$/).parse(form.get('price')),
    currency: z.string().regex(/^[A-Z]{3}$/).parse(form.get('currency')),
    source: z.enum(priceSources).parse(form.get('source')),
    pricedBy: z.string().trim().min(1).max(200).parse(form.get('pricedBy')),
  }), 'Part price recorded');
}
export async function draftPartsQuotationAction(form: FormData) {
  const id = uuid.parse(form.get('requestId'));
  await run(id, () => draftPartsQuotation(id), 'Quotation drafted');
}
export async function approvePartsQuotationAction(form: FormData) {
  const id = uuid.parse(form.get('requestId'));
  await run(id, () => approvePartsQuotation(uuid.parse(form.get('quotationId'))), 'Quotation approved');
}
export async function completePartsTermsAction(form: FormData) {
  const id = uuid.parse(form.get('requestId'));
  await run(id, () => completePartsTerms(uuid.parse(form.get('quotationId')),
    z.string().trim().min(1).max(500).parse(form.get('paymentTerms')),
    z.string().trim().min(1).max(500).parse(form.get('deliveryText'))), 'Terms completed');
}
export async function issuePartsQuotationAction(form: FormData) {
  const id = uuid.parse(form.get('requestId'));
  await run(id, () => issuePartsQuotation(uuid.parse(form.get('quotationId'))), 'Parts quotation issued');
}
