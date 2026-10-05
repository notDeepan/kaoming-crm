'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { completeDocumentApproval, markDocumentPrinted, releaseDocument } from '@/features/documents/service';
import { createOrderFromPo, issuePiDocument, markDealWon, recordDeposit, verifyCustomerPo } from './service';

const uuid = z.string().uuid();

function errorText(error: unknown) {
  const message = error instanceof Error ? error.message : 'The order action could not be completed';
  return /^(Failed query|password|DATABASE_URL)/i.test(message) ? 'The order action could not be completed' : message;
}

async function run(dealId: string, work: () => Promise<unknown>, success: string) {
  try { await work(); }
  catch (error) { redirect(`/deals/${dealId}/order?error=${encodeURIComponent(errorText(error))}`); }
  revalidatePath(`/deals/${dealId}/order`);
  revalidatePath(`/deals/${dealId}`);
  redirect(`/deals/${dealId}/order?notice=${encodeURIComponent(success)}`);
}

export async function createOrderAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  await run(dealId, async () => {
    const file = formData.get('customerPo');
    if (!(file instanceof File)) throw new Error('Attach the customer PO PDF');
    const poRef = z.string().trim().min(1).max(200).parse(formData.get('poRef'));
    const depositPercent = z.coerce.number().min(0).max(100).parse(formData.get('depositPercent'));
    await createOrderFromPo(dealId, { poRef, filename: file.name,
      pdfBytes: new Uint8Array(await file.arrayBuffer()), depositPercent });
  }, 'Customer PO recorded');
}

export async function verifyPoAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  await run(dealId, async () => {
    if (formData.get('verifiedLineByLine') !== 'on') throw new Error('Check each customer PO line against the final quotation first');
    await verifyCustomerPo(uuid.parse(formData.get('orderId')),
      z.string().trim().max(2000).parse(formData.get('varianceNotes')));
  }, 'Customer PO verified');
}

export async function recordDepositAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  await run(dealId, () => recordDeposit(uuid.parse(formData.get('orderId')),
    z.string().regex(/^\d+(?:\.\d{1,2})?$/).parse(formData.get('amount'))), 'Deposit received');
}

export async function markWonAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  await run(dealId, () => markDealWon(dealId), 'Deal marked won');
}

export async function issuePiAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  await run(dealId, () => issuePiDocument(uuid.parse(formData.get('orderId'))), 'PI 訂單 issued');
}

export async function markPrintedAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  await run(dealId, () => markDocumentPrinted(uuid.parse(formData.get('documentId'))), 'Printed copy recorded');
}

export async function completeApprovalAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  await run(dealId, () => completeDocumentApproval(
    uuid.parse(formData.get('documentId')), uuid.parse(formData.get('approvalId')),
  ), 'Signature recorded');
}

export async function releaseDocumentAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  await run(dealId, () => releaseDocument(uuid.parse(formData.get('documentId'))), 'Document released');
}
