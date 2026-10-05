import { z } from 'zod';
import isISO31661Alpha2 from 'validator/lib/isISO31661Alpha2';
import isISO4217 from 'validator/lib/isISO4217';
import {
  commissionModels, exclusivities, itemTypes, partnerRelationships,
  partnerStatuses, regions,
} from '@/db/enums';

const id = z.union([z.string().uuid(), z.literal('')]).optional().transform((value) => value || undefined);
const optionalText = z.string().trim().transform((value) => value || null);
const optionalOverrideText = z.string().trim().optional().transform((value) => value || null);
const code = z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
const countryCode = z.string().trim().regex(/^[A-Z]{2}$/).refine(isISO31661Alpha2, 'Invalid ISO country code');
const currencyCode = z.string().trim().regex(/^[A-Z]{3}$/).refine(isISO4217, 'Invalid ISO currency code');

export const partnerInput = z.object({
  id,
  code,
  name: z.string().trim().min(1).max(200),
  nameZh: optionalText,
  countryCode,
  region: z.enum(regions),
  lifecycleStatus: z.enum(partnerStatuses),
  relationshipType: z.enum(partnerRelationships),
  commissionModel: z.enum(commissionModels),
  exclusivity: z.union([z.enum(exclusivities), z.literal('')]).transform((value) => value || null),
  defaultCurrency: currencyCode,
  notes: optionalText,
});

export const machineModelInput = z.object({
  id,
  code,
  nameEn: z.string().trim().min(1).max(200),
  nameZh: z.string().trim().min(1).max(200),
  productLine: optionalText,
  isActive: z.boolean(),
});

export const itemInput = z.object({
  id,
  code,
  nameEn: z.string().trim().min(1).max(300),
  nameZh: z.string().trim().min(1).max(300),
  itemType: z.enum(itemTypes),
  specCategoryId: id,
  machineModelId: id,
  unit: z.string().trim().min(1).max(30),
  isStandardAccessory: z.boolean(),
  specOverrideEn: optionalOverrideText,
  specOverrideZh: optionalOverrideText,
}).superRefine((value, context) => {
  if (value.itemType !== 'spec_change') return;
  if (!value.specCategoryId) context.addIssue({ code: 'custom', path: ['specCategoryId'], message: 'Specification category is required' });
  if (!value.specOverrideEn) context.addIssue({ code: 'custom', path: ['specOverrideEn'], message: 'English replacement value is required' });
  if (!value.specOverrideZh) context.addIssue({ code: 'custom', path: ['specOverrideZh'], message: 'Chinese replacement value is required' });
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  },
  'Invalid date',
);

export const priceBookVersionInput = z.object({
  id,
  name: z.string().trim().min(1).max(80),
  effectiveFrom: isoDate,
  effectiveTo: z.union([isoDate, z.literal('')]).transform((value) => value || null),
}).refine(
  (value) => !value.effectiveTo || value.effectiveTo >= value.effectiveFrom,
  { path: ['effectiveTo'], message: 'End date must not be before start date' },
);

export const complianceProfileInput = z.object({
  partnerId: z.string().uuid(),
  voltage: optionalText,
  frequency: optionalText,
  phase: optionalText,
  ceVariant: optionalText,
  labelLanguages: z.string().trim(),
  nameplateRequired: z.boolean(),
  defaultColourCodes: z.string().trim(),
});

export type ActionState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export const initialActionState: ActionState = { ok: false };

export function formStrings(formData: FormData): Record<string, string> {
  return Object.fromEntries(
    [...formData.entries()].filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}

export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? 'form');
    const message = issue.code === 'invalid_type' ? 'Required'
      : issue.code === 'too_small' ? 'Value is too short'
        : issue.code === 'too_big' ? 'Value is too long'
          : issue.code === 'invalid_enum_value' ? 'Choose a valid value'
            : issue.code === 'invalid_string' ? 'Invalid value'
              : issue.message;
    (result[field] ??= []).push(message);
  }
  return result;
}
