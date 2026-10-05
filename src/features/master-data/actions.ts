'use server';

import { and, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { invalidateDraftModelProposals } from './model-assets';
import { getDb } from '@/db/client';
import {
  items, machineModels, partnerComplianceProfiles, partners, priceBookVersions,
} from '@/db/schema';
import { requireRole } from '@/lib/authorization';
import {
  type ActionState, complianceProfileInput, fieldErrors, formStrings, itemInput,
  machineModelInput, partnerInput, priceBookVersionInput,
} from './validation';

function databaseError(error: unknown): ActionState {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
  if (code === '23505') return { ok: false, message: 'That code or name already exists' };
  if (code === '23503') return { ok: false, message: 'A selected related record does not exist' };
  return { ok: false, message: 'The record could not be saved' };
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === 'on';
}

function recordId(formData: FormData) {
  return z.string().uuid().parse(formData.get('id'));
}

async function archive(table: typeof partners | typeof machineModels | typeof items | typeof priceBookVersions, id: string, actorId: string) {
  // Master records remain available to historical foreign keys and audit records.
  const archived = await getDb().update(table)
    .set({ deletedAt: new Date(), updatedAt: new Date(), updatedBy: actorId })
    .where(and(eq(table.id, id), isNull(table.deletedAt)))
    .returning({ id: table.id });
  if (!archived.length) throw new Error('Record was not found.');
}

export async function savePartner(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireRole('admin', 'manager');
  const parsed = partnerInput.safeParse(formStrings(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const { id, ...values } = parsed.data;
  const db = getDb();
  try {
    if (id) {
      const updated = await db.update(partners)
        .set({ ...values, updatedAt: new Date(), updatedBy: actor.id })
        .where(and(eq(partners.id, id), isNull(partners.deletedAt)))
        .returning({ id: partners.id });
      if (!updated.length) return { ok: false, message: 'Partner was not found' };
    } else {
      await db.transaction(async (tx) => {
        const [created] = await tx.insert(partners)
          .values({ ...values, createdBy: actor.id, updatedBy: actor.id })
          .returning({ id: partners.id });
        if (!created) throw new Error('Partner insert returned no ID');
        await tx.insert(partnerComplianceProfiles).values({
          partnerId: created.id, createdBy: actor.id, updatedBy: actor.id,
        });
      });
    }
    revalidatePath('/partners');
    return { ok: true, message: 'Partner saved' };
  } catch (error) {
    return databaseError(error);
  }
}

export async function saveComplianceProfile(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireRole('admin', 'manager', 'sales');
  const parsed = complianceProfileInput.safeParse({
    ...formStrings(formData), nameplateRequired: bool(formData, 'nameplateRequired'),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const { partnerId, labelLanguages, defaultColourCodes, ...values } = parsed.data;
  try {
    const [partner] = await getDb().select({ id: partners.id }).from(partners)
      .where(and(eq(partners.id, partnerId), isNull(partners.deletedAt))).limit(1);
    if (!partner) return { ok: false, message: 'Partner was not found' };
    await getDb().insert(partnerComplianceProfiles).values({
      partnerId,
      ...values,
      labelLanguages: labelLanguages ? labelLanguages.split(',').map((value) => value.trim()).filter(Boolean) : null,
      defaultColourCodes: defaultColourCodes ? defaultColourCodes.split(',').map((value) => value.trim()).filter(Boolean) : null,
      createdBy: actor.id,
      updatedBy: actor.id,
    }).onConflictDoUpdate({
      target: partnerComplianceProfiles.partnerId,
      set: {
        ...values,
        labelLanguages: labelLanguages ? labelLanguages.split(',').map((value) => value.trim()).filter(Boolean) : null,
        defaultColourCodes: defaultColourCodes ? defaultColourCodes.split(',').map((value) => value.trim()).filter(Boolean) : null,
        updatedAt: new Date(),
        updatedBy: actor.id,
      },
    });
    revalidatePath(`/partners/${partnerId}`);
    return { ok: true, message: 'Compliance profile saved' };
  } catch (error) {
    return databaseError(error);
  }
}

export async function saveMachineModel(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireRole('admin', 'manager');
  const parsed = machineModelInput.safeParse({ ...formStrings(formData), isActive: bool(formData, 'isActive') });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const { id, ...values } = parsed.data;
  try {
    if (id) {
      const updated = await getDb().transaction(async (tx) => {
        const rows = await tx.update(machineModels)
          .set({ ...values, updatedAt: new Date(), updatedBy: actor.id })
          .where(and(eq(machineModels.id, id), isNull(machineModels.deletedAt)))
          .returning({ id: machineModels.id });
        if (rows.length) await invalidateDraftModelProposals(tx, id);
        return rows;
      });
      if (!updated.length) return { ok: false, message: 'Machine model was not found' };
    } else {
      await getDb().insert(machineModels).values({ ...values, createdBy: actor.id, updatedBy: actor.id });
    }
    revalidatePath('/products');
    return { ok: true, message: 'Machine model saved' };
  } catch (error) {
    return databaseError(error);
  }
}

export async function saveItem(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireRole('admin', 'manager');
  const parsed = itemInput.safeParse({
    ...formStrings(formData), isStandardAccessory: bool(formData, 'isStandardAccessory'),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const { id, specCategoryId, machineModelId, specOverrideEn, specOverrideZh, ...rest } = parsed.data;
  const values = {
    ...rest,
    specCategoryId: specCategoryId ?? null,
    machineModelId: machineModelId ?? null,
    specOverride: rest.itemType === 'spec_change'
      ? { valueEn: specOverrideEn!, valueZh: specOverrideZh! }
      : null,
  };
  try {
    if (id) {
      const updated = await getDb().update(items)
        .set({ ...values, updatedAt: new Date(), updatedBy: actor.id })
        .where(and(eq(items.id, id), isNull(items.deletedAt)))
        .returning({ id: items.id });
      if (!updated.length) return { ok: false, message: 'Item was not found' };
    } else {
      await getDb().insert(items).values({ ...values, createdBy: actor.id, updatedBy: actor.id });
    }
    revalidatePath('/products');
    return { ok: true, message: 'Item saved' };
  } catch (error) {
    return databaseError(error);
  }
}

export async function archiveItem(formData: FormData): Promise<void> {
  const actor = await requireRole('admin', 'manager');
  await archive(items, recordId(formData), actor.id);
  revalidatePath('/products');
  redirect('/products/items');
}

export async function archivePriceBookDraft(formData: FormData): Promise<void> {
  const actor = await requireRole('admin', 'manager');
  const id = recordId(formData);
  const archived = await getDb().update(priceBookVersions)
    .set({ deletedAt: new Date(), updatedAt: new Date(), updatedBy: actor.id })
    .where(and(eq(priceBookVersions.id, id), eq(priceBookVersions.isPublished, false), isNull(priceBookVersions.deletedAt)))
    .returning({ id: priceBookVersions.id });
  if (!archived.length) throw new Error('Only existing price book drafts may be archived.');
  revalidatePath('/products');
  redirect('/products/price-books');
}

export async function savePriceBookVersion(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireRole('admin', 'manager');
  const parsed = priceBookVersionInput.safeParse(formStrings(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const { id, ...values } = parsed.data;
  try {
    if (id) {
      const [existing] = await getDb().select({ isPublished: priceBookVersions.isPublished })
        .from(priceBookVersions)
        .where(and(eq(priceBookVersions.id, id), isNull(priceBookVersions.deletedAt))).limit(1);
      if (!existing) return { ok: false, message: 'Price book version was not found' };
      if (existing.isPublished) return { ok: false, message: 'Published price books cannot be edited' };
      const updated = await getDb().update(priceBookVersions)
        .set({ ...values, updatedAt: new Date(), updatedBy: actor.id })
        .where(and(eq(priceBookVersions.id, id), eq(priceBookVersions.isPublished, false), isNull(priceBookVersions.deletedAt)))
        .returning({ id: priceBookVersions.id });
      if (!updated.length) return { ok: false, message: 'Published price books cannot be edited' };
    } else {
      await getDb().insert(priceBookVersions).values({
        ...values, isPublished: false, createdBy: actor.id, updatedBy: actor.id,
      });
    }
    revalidatePath('/products');
    return { ok: true, message: 'Price book draft saved' };
  } catch (error) {
    return databaseError(error);
  }
}
