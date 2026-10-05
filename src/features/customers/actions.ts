'use server';

import { and, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import isISO31661Alpha2 from 'validator/lib/isISO31661Alpha2';
import { getDb } from '@/db/client';
import { customers, partners } from '@/db/schema';
import { requireRole } from '@/lib/authorization';

export async function createCustomerAction(formData: FormData) {
  const actor = await requireRole('admin', 'manager', 'sales');
  const parsed = z.object({
    partnerId: z.string().uuid(), name: z.string().trim().min(1).max(200),
    countryCode: z.union([z.string().regex(/^[A-Z]{2}$/).refine(isISO31661Alpha2), z.literal('')]),
    industry: z.string().trim().max(150),
    source: z.enum(['agent_disclosed', 'fat_visit', 'warranty_registration']),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/customers?error=Check%20the%20customer%20fields');
  const [partner] = await getDb().select({ id: partners.id }).from(partners)
    .where(and(eq(partners.id, parsed.data.partnerId), isNull(partners.deletedAt))).limit(1);
  if (!partner) redirect('/customers?error=Select%20an%20active%20partner');
  const { countryCode, industry, ...required } = parsed.data;
  await getDb().insert(customers).values({ ...required,
    countryCode: countryCode || null, industry: industry || null,
    createdBy: actor.id, updatedBy: actor.id,
  });
  revalidatePath('/customers');
  revalidatePath('/deals/new');
  redirect('/customers?notice=Customer%20created');
}
