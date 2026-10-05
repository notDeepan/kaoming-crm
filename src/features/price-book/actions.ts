'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { discardPriceImport, publishPriceImport, uploadPriceFile } from './service';

function safeMessage(error: unknown) {
  const message = error instanceof Error ? error.message : 'The price list action failed';
  return /^Failed query/i.test(message) ? 'The price list action failed' : message;
}

export async function uploadPriceImportAction(formData: FormData) {
  let id: string;
  try {
    const file = formData.get('priceFile');
    if (!(file instanceof File) || file.size === 0) throw new Error('Select a CSV or XLSX price file');
    const result = await uploadPriceFile(file.name, new Uint8Array(await file.arrayBuffer()));
    id = result.id;
  } catch (error) {
    redirect(`/products/price-books/imports?error=${encodeURIComponent(safeMessage(error))}`);
  }
  revalidatePath('/products/price-books/imports');
  redirect(`/products/price-books/imports?view=${id}`);
}

export async function publishPriceImportAction(formData: FormData) {
  const importId = z.string().uuid().parse(formData.get('importId'));
  try {
    await publishPriceImport(importId,
      z.string().trim().min(1).max(80).parse(formData.get('name')),
      z.string().parse(formData.get('effectiveFrom')),
      formData.get('confirmed') === 'on');
  } catch (error) {
    redirect(`/products/price-books/imports?view=${importId}&error=${encodeURIComponent(safeMessage(error))}`);
  }
  revalidatePath('/products/price-books');
  revalidatePath('/products/price-books/imports');
  redirect(`/products/price-books/imports?view=${importId}&notice=Published`);
}

export async function discardPriceImportAction(formData: FormData) {
  const importId = z.string().uuid().parse(formData.get('importId'));
  await discardPriceImport(importId);
  revalidatePath('/products/price-books/imports');
  redirect(`/products/price-books/imports?view=${importId}&notice=Discarded`);
}
