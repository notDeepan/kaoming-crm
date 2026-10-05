'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { attributions, delayReasons, fatOutcomes } from '@/db/enums';
import { concludeFat, recordProgressReview, scheduleFat, verifyFatItem } from './service';

const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function run(dealId: string, work: () => Promise<unknown>, notice: string) {
  try { await work(); }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Production action failed';
    redirect(`/deals/${dealId}/production?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/deals/${dealId}/production`);
  redirect(`/deals/${dealId}/production?notice=${encodeURIComponent(notice)}`);
}

export async function fillReviewAction(form: FormData) {
  const dealId = uuid.parse(form.get('dealId'));
  await run(dealId, () => recordProgressReview(uuid.parse(form.get('reviewId')), {
    reportedStage: z.enum(['casting', 'machining', 'assembly', 'wiring', 'run-in']).parse(form.get('reportedStage')),
    expectedCompletion: date.parse(form.get('expectedCompletion')),
    delayReason: z.enum(delayReasons).nullable().parse(form.get('delayReason') || null),
    attribution: z.enum(attributions).nullable().parse(form.get('attribution') || null),
  }), 'Monthly progress review recorded');
}

export async function scheduleFatAction(form: FormData) {
  const dealId = uuid.parse(form.get('dealId'));
  await run(dealId, () => scheduleFat(uuid.parse(form.get('workOrderId')), date.parse(form.get('scheduledFor'))),
    'FAT scheduled with checklist from the issued specification');
}

export async function verifyFatItemAction(form: FormData) {
  const dealId = uuid.parse(form.get('dealId'));
  await run(dealId, () => verifyFatItem(uuid.parse(form.get('itemId')), form.get('verified') === 'true',
    z.string().trim().max(1000).parse(form.get('notes'))), 'FAT checklist updated');
}

export async function concludeFatAction(form: FormData) {
  const dealId = uuid.parse(form.get('dealId'));
  await run(dealId, () => concludeFat(uuid.parse(form.get('fatId')), {
    conductedAt: date.parse(form.get('conductedAt')),
    outcome: z.enum(fatOutcomes).parse(form.get('outcome')),
    attendees: z.string().trim().max(1000).parse(form.get('attendees')),
    punchList: z.string().trim().max(5000).parse(form.get('punchList')).split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
    customerContactCaptured: form.get('customerContactCaptured') === 'on',
  }), 'FAT outcome recorded');
}
