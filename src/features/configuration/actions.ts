'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { generateDealConfiguration, saveManualSpecValue } from './service';

const uuid = z.string().uuid();

function message(error: unknown) {
  const text = error instanceof Error ? error.message : 'The configuration could not be saved';
  return /^(Failed query|password|DATABASE_URL)/i.test(text) ? 'The configuration could not be saved' : text;
}

export async function generateConfigurationAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  try { await generateDealConfiguration(dealId, formData.get('replaceManual') === 'on'); }
  catch (error) { redirect(`/deals/${dealId}/configuration?error=${encodeURIComponent(message(error))}`); }
  revalidatePath(`/deals/${dealId}/configuration`);
  redirect(`/deals/${dealId}/configuration?notice=Configuration%20generated`);
}

export async function saveSpecValueAction(formData: FormData) {
  const dealId = uuid.parse(formData.get('dealId'));
  try {
    const categoryId = uuid.parse(formData.get('categoryId'));
    const valueEn = z.string().trim().min(1).max(5000).parse(formData.get('valueEn'));
    const valueZh = z.string().trim().min(1).max(5000).parse(formData.get('valueZh'));
    await saveManualSpecValue(dealId, categoryId, valueEn, valueZh);
  } catch (error) { redirect(`/deals/${dealId}/configuration?error=${encodeURIComponent(message(error))}`); }
  revalidatePath(`/deals/${dealId}/configuration`);
  redirect(`/deals/${dealId}/configuration?notice=Specification%20saved`);
}
