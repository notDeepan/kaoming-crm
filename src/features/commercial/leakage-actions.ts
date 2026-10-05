'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { attributions, leakageCategories, recoveryStatuses } from '@/db/enums';
import { recordLeakage } from './leakage';

export async function recordLeakageAction(form: FormData) {
  try {
    await recordLeakage({
      dealId: z.string().uuid().parse(form.get('dealId')),
      category: z.enum(leakageCategories).parse(form.get('category')),
      amount: z.string().regex(/^\d+(?:\.\d{1,2})?$/).parse(form.get('amount')),
      currency: z.string().regex(/^[A-Z]{3}$/).parse(form.get('currency')),
      incurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(form.get('incurredOn')),
      attribution: z.enum(attributions).parse(form.get('attribution')),
      recoveryStatus: z.enum(recoveryStatuses).parse(form.get('recoveryStatus')),
      notes: z.string().trim().max(3000).parse(form.get('notes') ?? ''),
    });
  } catch (error) {
    redirect(`/leakage?error=${encodeURIComponent(error instanceof Error ? error.message : 'Leakage entry failed')}`);
  }
  revalidatePath('/leakage');
  redirect('/leakage?notice=Leakage%20recorded');
}
