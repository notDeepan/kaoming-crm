'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { completeDocumentApproval, markDocumentPrinted, releaseDocument } from '@/features/documents/service';
import {
  acknowledgeSpecSheetDistribution, createSpecRevision, createWorkOrderDraft, issueSpecRevision,
  issueWorkOrder, recordSpecSheetDistribution, refreshDraftSpecification, uploadCustomChangeImage,
} from './service';

const uuid = z.string().uuid();

function errorText(error: unknown) {
  const message = error instanceof Error ? error.message : 'The manufacturing action could not be completed';
  return /^(Failed query|password|DATABASE_URL)/i.test(message) ? 'The manufacturing action could not be completed' : message;
}

async function run(dealId: string, work: () => Promise<unknown>, success: string) {
  try { await work(); }
  catch (error) { redirect(`/deals/${dealId}/manufacturing?error=${encodeURIComponent(errorText(error))}`); }
  revalidatePath(`/deals/${dealId}/manufacturing`);
  redirect(`/deals/${dealId}/manufacturing?notice=${encodeURIComponent(success)}`);
}

export async function createMiDraftAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  await run(dealId, () => createWorkOrderDraft(uuid.parse(formData.get('orderId')), {
    batchNumber: z.string().trim().max(100).parse(formData.get('batchNumber')),
    plannedStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')).parse(formData.get('plannedStart')) || null,
    plannedFinish: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')).parse(formData.get('plannedFinish')) || null,
    isProvisional: formData.get('isProvisional') === 'on',
    provisionalHoldStage: z.string().trim().max(1000).parse(formData.get('provisionalHoldStage')),
  }), 'MI draft and specification 版次 1 created');
}

export async function uploadCustomImageAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  await run(dealId, async () => {
    const file = formData.get('image');
    if (!(file instanceof File)) throw new Error('Choose a PNG or JPEG image');
    await uploadCustomChangeImage(dealId, uuid.parse(formData.get('sheetId')),
      file.name, new Uint8Array(await file.arrayBuffer()));
  }, 'Custom image bound to specification revision');
}

export async function issueMiAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  await run(dealId, () => issueWorkOrder(uuid.parse(formData.get('workOrderId')),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(formData.get('contractualDeliveryDate'))), 'MI and specification PDFs issued');
}

export async function refreshSpecDraftAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  await run(dealId, () => refreshDraftSpecification(uuid.parse(formData.get('workOrderId'))),
    'Draft specification refreshed from configuration');
}

export async function createSpecRevisionAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  await run(dealId, () => createSpecRevision(uuid.parse(formData.get('workOrderId'))),
    'New specification revision created');
}

export async function issueSpecRevisionAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  await run(dealId, () => issueSpecRevision(uuid.parse(formData.get('workOrderId'))),
    'Specification revision PDF issued');
}

export async function markManufacturingPrintedAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  await run(dealId, () => markDocumentPrinted(uuid.parse(formData.get('documentId'))), 'Printed copy recorded');
}

export async function approveManufacturingDocumentAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  await run(dealId, () => completeDocumentApproval(uuid.parse(formData.get('documentId')),
    uuid.parse(formData.get('approvalId'))), 'Signature recorded');
}

export async function releaseManufacturingDocumentAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  await run(dealId, () => releaseDocument(uuid.parse(formData.get('documentId'))), 'Document released');
}

export async function distributeSpecAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  await run(dealId, () => recordSpecSheetDistribution(uuid.parse(formData.get('sheetId')),
    z.enum(['生管', '採購', '製造']).parse(formData.get('department'))), 'Paper copy distribution recorded');
}

export async function acknowledgeSpecAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  await run(dealId, () => acknowledgeSpecSheetDistribution(uuid.parse(formData.get('distributionId'))),
    'Paper copy acknowledged');
}
