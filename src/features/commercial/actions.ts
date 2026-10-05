'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { recordCommissionClaim, settleCommission } from './service';

const uuid = z.string().uuid();
async function run(work: () => Promise<unknown>, notice: string) {
  try { await work(); }
  catch (error) { redirect(`/commissions?error=${encodeURIComponent(error instanceof Error ? error.message : 'Commission action failed')}`); }
  revalidatePath('/commissions');
  redirect(`/commissions?notice=${encodeURIComponent(notice)}`);
}
export async function claimCommissionAction(form: FormData) {
  await run(() => recordCommissionClaim(uuid.parse(form.get('commissionId')),
    z.string().regex(/^\d+(?:\.\d{1,2})?$/).parse(form.get('amount'))), 'Commission claim recorded');
}
export async function settleCommissionAction(form: FormData) {
  await run(() => settleCommission(uuid.parse(form.get('commissionId'))), 'Commission settled');
}
