'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { claimCategories, claimEventTypes, claimResponsibilities, leakageCategories, recoveryStatuses, settlementMethods } from '@/db/enums';
import {
  addClaimLine, applyPendingCredit, closeClaim, createClaim, decideClaimLine, recordClaimEvent,
  linkClaimCase, recordClaimOffer, recordClaimPosition, recordNextAction, settleClaim,
} from './service';

const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function message(error: unknown) {
  const value = error instanceof Error ? error.message : 'Claim action failed';
  return /^(Failed query|password|DATABASE_URL)/i.test(value) ? 'Claim action failed' : value;
}

async function run(claimId: string, work: () => Promise<unknown>, notice: string) {
  try { await work(); }
  catch (error) { redirect(`/claims/${claimId}?error=${encodeURIComponent(message(error))}`); }
  revalidatePath(`/claims/${claimId}`); revalidatePath('/claims');
  redirect(`/claims/${claimId}?notice=${encodeURIComponent(notice)}`);
}

export async function createClaimAction(form: FormData) {
  let claimId: string;
  try {
    const claim = await createClaim({ machineId: uuid.parse(form.get('machineId')),
      receivedAt: date.parse(form.get('receivedAt')),
      sourceReference: z.string().trim().max(500).parse(form.get('sourceReference')),
      category: z.enum(claimCategories).parse(form.get('category')),
      description: z.string().trim().min(1).max(5000).parse(form.get('description')),
      claimedAmount: z.string().trim().min(1).parse(form.get('claimedAmount')),
      claimedCurrency: z.string().trim().length(3).parse(form.get('claimedCurrency')).toUpperCase(),
      responsibility: z.enum(claimResponsibilities).parse(form.get('responsibility')),
    });
    claimId = claim.id;
  } catch (error) { redirect(`/claims?error=${encodeURIComponent(message(error))}`); }
  revalidatePath('/claims'); redirect(`/claims/${claimId}?notice=Claim%20registered`);
}

export async function addClaimLineAction(form: FormData) {
  const id = uuid.parse(form.get('claimId'));
  await run(id, () => addClaimLine(id, { description: z.string().trim().min(1).max(2000).parse(form.get('description')),
    amount: z.string().trim().min(1).parse(form.get('amount')),
    currency: z.string().trim().length(3).parse(form.get('currency')).toUpperCase(),
    notes: z.string().trim().max(1000).parse(form.get('notes')) }), 'Claim item added');
}

export async function decideClaimLineAction(form: FormData) {
  const id = uuid.parse(form.get('claimId'));
  await run(id, () => decideClaimLine(uuid.parse(form.get('lineId')),
    z.enum(['true', 'false']).parse(form.get('accepted')) === 'true',
    z.string().trim().max(1000).parse(form.get('notes'))), 'Claim item decision recorded');
}

export async function recordClaimPositionAction(form: FormData) {
  const id = uuid.parse(form.get('claimId'));
  await run(id, () => recordClaimPosition(id,
    z.string().trim().min(1).max(3000).parse(form.get('position')),
    date.parse(form.get('occurredAt'))), 'Position recorded');
}

export async function recordClaimEventAction(form: FormData) {
  const id = uuid.parse(form.get('claimId'));
  await run(id, () => recordClaimEvent(id, {
    eventType: z.enum(claimEventTypes).parse(form.get('eventType')),
    occurredAt: date.parse(form.get('occurredAt')),
    summary: z.string().trim().min(1).max(3000).parse(form.get('summary')),
    attachmentUrl: z.string().trim().max(1000).parse(form.get('attachmentUrl')),
  }), 'Claim event recorded');
}

export async function recordClaimOfferAction(form: FormData) {
  const id = uuid.parse(form.get('claimId'));
  await run(id, () => recordClaimOffer(id,
    z.string().trim().min(1).parse(form.get('amount')),
    z.string().trim().length(3).parse(form.get('currency')).toUpperCase()), 'Offer recorded');
}

export async function recordNextActionAction(form: FormData) {
  const id = uuid.parse(form.get('claimId'));
  await run(id, () => recordNextAction(id,
    z.string().trim().min(1).max(2000).parse(form.get('nextAction'))), 'Next action recorded');
}

export async function linkClaimCaseAction(form: FormData) {
  const id = uuid.parse(form.get('claimId'));
  await run(id, () => linkClaimCase(id, uuid.parse(form.get('caseId'))), 'Service case linked');
}

export async function settleClaimAction(form: FormData) {
  const id = uuid.parse(form.get('claimId'));
  await run(id, () => settleClaim(id, {
    method: z.enum(settlementMethods).parse(form.get('method')),
    amount: z.string().trim().min(1).parse(form.get('amount')),
    currency: z.string().trim().length(3).parse(form.get('currency')).toUpperCase(),
    outcome: z.string().trim().max(3000).parse(form.get('outcome')),
    leakageCategory: z.enum(leakageCategories).nullable().parse(form.get('leakageCategory') || null),
    recoveryStatus: z.enum(recoveryStatuses).nullable().parse(form.get('recoveryStatus') || null),
    fxRate: z.string().trim().nullable().parse(form.get('fxRate') || null),
    fxRateDate: z.string().trim().nullable().parse(form.get('fxRateDate') || null),
    costSharePct: z.string().trim().nullable().parse(form.get('costSharePct') || null),
    incurredOn: z.string().trim().nullable().parse(form.get('incurredOn') || null),
  }), 'Claim settled');
}

export async function applyPendingCreditAction(form: FormData) {
  const id = uuid.parse(form.get('claimId'));
  await run(id, () => applyPendingCredit(id, uuid.parse(form.get('orderId'))), 'Pending credit applied to order');
}

export async function closeClaimAction(form: FormData) {
  const id = uuid.parse(form.get('claimId'));
  await run(id, () => closeClaim(id), 'Claim closed');
}
