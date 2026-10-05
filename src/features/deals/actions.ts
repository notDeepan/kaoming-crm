'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { generateTechnicalProposal } from '@/features/proposal/service';
import {
  addQuotationLine, approveQuotationDiscount, attachTechnicalProposal, createDeal,
  createQuotationRevision, issueQuotation, recordDesignReview, removeQuotationLine,
  refreshDraftPriceBook, saveQuotationTerms,
} from './service';

const uuid = z.string().uuid();
const text = z.string().trim();
const maxFileSize = 10_000_000;

function errorText(error: unknown) {
  const message = error instanceof Error ? error.message : 'The action could not be completed';
  return /^(Failed query|password|DATABASE_URL)/i.test(message) ? 'The action could not be completed' : message;
}

async function runDealAction(dealId: string, work: () => Promise<unknown>, success: string) {
  try { await work(); }
  catch (error) { redirect(`/deals/${dealId}?error=${encodeURIComponent(errorText(error))}`); }
  revalidatePath(`/deals/${dealId}`);
  revalidatePath('/deals');
  redirect(`/deals/${dealId}?notice=${encodeURIComponent(success)}`);
}

export async function createDealAction(formData: FormData) {
  let created: Awaited<ReturnType<typeof createDeal>>;
  try {
    const values = z.object({
      partnerId: uuid, customerId: z.string().optional(), machineModelId: z.string().optional(),
      regionBand: z.enum(['eu', 'non_eu']), currency: z.string().length(3),
      enquiryDate: z.string(),
    }).parse(Object.fromEntries(formData));
    created = await createDeal(values);
  } catch (error) {
    redirect(`/deals/new?error=${encodeURIComponent(errorText(error))}`);
  }
  revalidatePath('/deals');
  redirect(`/deals/${created.id}`);
}

export async function newRevisionAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  await runDealAction(dealId, () => createQuotationRevision(dealId), 'Draft revision created');
}

export async function addLineAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  const quoteId = uuid.parse(formData.get('quoteId'));
  await runDealAction(dealId, () => addQuotationLine(quoteId, {
    itemId: uuid.parse(formData.get('itemId')),
    quantity: text.min(1).parse(formData.get('quantity')),
    lineDiscount: text.min(1).parse(formData.get('lineDiscount')),
    included: formData.get('included') === 'on',
  }), 'Line added');
}

export async function removeLineAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  await runDealAction(dealId, () => removeQuotationLine(uuid.parse(formData.get('lineId'))), 'Line removed');
}

export async function refreshDraftPricesAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  await runDealAction(dealId, () => refreshDraftPriceBook(uuid.parse(formData.get('quoteId'))), 'Draft prices refreshed');
}

export async function saveTermsAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  const quoteId = uuid.parse(formData.get('quoteId'));
  await runDealAction(dealId, () => saveQuotationTerms(quoteId, {
    paymentTerms: text.parse(formData.get('paymentTerms')),
    deliveryTerms: text.parse(formData.get('deliveryTerms')),
    leadTimeText: text.parse(formData.get('leadTimeText')),
    leadTimeWeeksFrom: z.enum(['po', 'deposit']).parse(formData.get('leadTimeWeeksFrom')),
    leadTimeEndsAt: z.enum(['ready_to_ship', 'arrived']).parse(formData.get('leadTimeEndsAt')),
    incoterm: z.enum(['EXW', 'FOB', 'CFR', 'CIF', 'CIP', 'DAP', 'DDP']).parse(formData.get('incoterm')),
    warrantyMonths: z.coerce.number().int().parse(formData.get('warrantyMonths')),
  }), 'Terms saved');
}

export async function designReviewAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  const quoteId = uuid.parse(formData.get('quoteId'));
  await runDealAction(dealId, () => recordDesignReview(
    quoteId, text.min(1).parse(formData.get('reviewedBy')),
    z.enum(['confirmed', 'rejected']).parse(formData.get('outcome')),
    text.parse(formData.get('notes')),
  ), 'Design review recorded');
}

export async function proposalUploadAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  const quoteId = uuid.parse(formData.get('quoteId'));
  await runDealAction(dealId, async () => {
    const file = formData.get('proposal');
    if (!(file instanceof File) || file.size < 100 || file.size > maxFileSize) throw new Error('Select a PDF up to 10 MB');
    await attachTechnicalProposal(quoteId, new Uint8Array(await file.arrayBuffer()));
  }, 'Technical proposal attached');
}

export async function generateProposalAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  await runDealAction(dealId,
    () => generateTechnicalProposal(uuid.parse(formData.get('quoteId'))),
    'Three-part technical proposal generated');
}

export async function approveDiscountAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  await runDealAction(dealId, () => approveQuotationDiscount(
    uuid.parse(formData.get('quoteId')),
    z.enum(['dept_manager', 'gm']).parse(formData.get('stage')),
  ), 'Discount approval recorded');
}

export async function issueQuotationAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  await runDealAction(dealId, () => issueQuotation(uuid.parse(formData.get('quoteId'))), 'Quotation issued');
}
