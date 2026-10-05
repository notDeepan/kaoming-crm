'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { saveModelBaseSpecs, uploadModelProposalAsset } from './model-assets';

const uuid = z.string().uuid();

async function run(modelId: string, work: () => Promise<unknown>, notice: string) {
  try { await work(); }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Model document could not be saved';
    const safe = /^(Failed query|password|DATABASE_URL)/i.test(message) ? 'Model document could not be saved' : message;
    redirect(`/products/models?edit=${modelId}&error=${encodeURIComponent(safe)}`);
  }
  revalidatePath('/products/models');
  redirect(`/products/models?edit=${modelId}&notice=${encodeURIComponent(notice)}`);
}

export async function saveBaseSpecsAction(formData: FormData) {
  const modelId = uuid.parse(formData.get('modelId'));
  await run(modelId, () => saveModelBaseSpecs(modelId, formData), 'Bilingual model specifications saved');
}

export async function uploadModelAssetAction(formData: FormData) {
  const modelId = uuid.parse(formData.get('modelId'));
  await run(modelId, async () => {
    const file = formData.get('proposal');
    if (!(file instanceof File)) throw new Error('Choose a model literature PDF');
    await uploadModelProposalAsset(modelId, file.name, new Uint8Array(await file.arrayBuffer()));
  }, 'Model literature PDF uploaded');
}
