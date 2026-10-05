'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  commissionModels, exclusivities, itemTypes, partnerRelationships,
  partnerStatuses, regions,
} from '@/db/enums';
import {
  saveComplianceProfile, saveItem, saveMachineModel, savePartner, savePriceBookVersion,
} from '@/features/master-data/actions';
import { type ActionState, initialActionState } from '@/features/master-data/validation';

const control = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-brand';
const label = 'block text-sm font-medium text-ink';
const grid = 'grid gap-5 md:grid-cols-2';

function Feedback({ state }: { state: ActionState }) {
  const t = useTranslations();
  const labels: Record<string, string> = {
    code: 'Code', name: 'Name', nameEn: 'English name', nameZh: 'Chinese name',
    countryCode: 'Country code', region: 'Region', lifecycleStatus: 'Lifecycle status',
    relationshipType: 'Relationship type', commissionModel: 'Commission model',
    exclusivity: 'Exclusivity', defaultCurrency: 'Default currency',
    notes: 'Notes', voltage: 'Voltage', frequency: 'Frequency', phase: 'Phase',
    ceVariant: 'CE variant', labelLanguages: 'Label languages',
    defaultColourCodes: 'Colour codes', productLine: 'Product line',
    itemType: 'TYPE', unit: 'Unit', isActive: 'Active model',
    effectiveFrom: 'Effective from', effectiveTo: 'Effective to',
    specCategoryId: 'Spec category', machineModelId: 'Machine model',
    specOverrideEn: 'English replacement value', specOverrideZh: 'Chinese replacement value',
  };
  const localized = (value: string) => t.has(value) ? t(value) : value;
  const fieldMessages = Object.entries(state.errors ?? {}).flatMap(([field, messages]) =>
    messages.map((message) => `${localized(labels[field] ?? field)}: ${localized(message)}`),
  );
  if (!state.message && fieldMessages.length === 0) return null;
  return (
    <div aria-live="polite" className={`rounded-md border p-3 text-sm ${state.ok ? 'border-green-200 bg-green-50 text-green-900' : 'border-red-200 bg-red-50 text-red-900'}`}>
      {state.message && <p>{localized(state.message)}</p>}
      {fieldMessages.length > 0 && <ul className="list-inside list-disc">{fieldMessages.map((message, index) => <li key={`${index}-${message}`}>{message}</li>)}</ul>}
    </div>
  );
}

function SelectOptions({ values }: { values: readonly string[] }) {
  const t = useTranslations();
  return values.map((value) => <option key={value} value={value}>{t(value)}</option>);
}

export type PartnerValues = {
  id: string; code: string; name: string; nameZh: string | null; countryCode: string;
  region: (typeof regions)[number]; lifecycleStatus: (typeof partnerStatuses)[number];
  relationshipType: (typeof partnerRelationships)[number]; commissionModel: (typeof commissionModels)[number];
  exclusivity: (typeof exclusivities)[number] | null; defaultCurrency: string; notes: string | null;
};

export function PartnerForm({ partner }: { partner?: PartnerValues }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(savePartner, initialActionState);
  return (
    <form action={action} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {partner && <input type="hidden" name="id" value={partner.id} />}
      <div className={grid}>
        <div><label htmlFor="partner-code" className={label}>{t('Code')}</label><input id="partner-code" name="code" defaultValue={partner?.code} required className={control} /></div>
        <div><label htmlFor="partner-name" className={label}>{t('Name')}</label><input id="partner-name" name="name" defaultValue={partner?.name} required className={control} /></div>
        <div><label htmlFor="partner-name-zh" className={label}>{t('Chinese name')}</label><input id="partner-name-zh" name="nameZh" defaultValue={partner?.nameZh ?? ''} className={control} /></div>
        <div><label htmlFor="partner-country" className={label}>{t('Country code')}</label><input id="partner-country" name="countryCode" maxLength={2} defaultValue={partner?.countryCode} placeholder="TR" required className={control} /></div>
        <div><label htmlFor="partner-region" className={label}>{t('Region')}</label><select id="partner-region" name="region" defaultValue={partner?.region ?? 'europe'} className={control}><SelectOptions values={regions} /></select></div>
        <div><label htmlFor="partner-status" className={label}>{t('Lifecycle status')}</label><select id="partner-status" name="lifecycleStatus" defaultValue={partner?.lifecycleStatus ?? 'prospect'} className={control}><SelectOptions values={partnerStatuses} /></select></div>
        <div><label htmlFor="partner-relationship" className={label}>{t('Relationship type')}</label><select id="partner-relationship" name="relationshipType" defaultValue={partner?.relationshipType ?? 'agent'} className={control}><SelectOptions values={partnerRelationships} /></select></div>
        <div><label htmlFor="partner-commission" className={label}>{t('Commission model')}</label><select id="partner-commission" name="commissionModel" defaultValue={partner?.commissionModel ?? 'markup'} className={control}><option value="markup">{t('Mark-up')}</option><option value="commission">{t('Commission')}</option></select></div>
        <div><label htmlFor="partner-exclusivity" className={label}>{t('Exclusivity')}</label><select id="partner-exclusivity" name="exclusivity" defaultValue={partner?.exclusivity ?? ''} className={control}><option value="">—</option><SelectOptions values={exclusivities} /></select></div>
        <div><label htmlFor="partner-currency" className={label}>{t('Default currency')}</label><input id="partner-currency" name="defaultCurrency" maxLength={3} defaultValue={partner?.defaultCurrency ?? 'USD'} required className={control} /></div>
      </div>
      <div><label htmlFor="partner-notes" className={label}>{t('Notes')}</label><textarea id="partner-notes" name="notes" rows={4} defaultValue={partner?.notes ?? ''} className={control} /></div>
      <Feedback state={state} />
      <button disabled={pending} type="submit" className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">{partner ? t('Save changes') : t('Add partner')}</button>
    </form>
  );
}

export type ComplianceValues = {
  voltage: string | null; frequency: string | null; phase: string | null; ceVariant: string | null;
  labelLanguages: string[] | null; nameplateRequired: boolean | null;
  defaultColourCodes: string[] | null;
};

export function ComplianceProfileForm({ partnerId, profile }: { partnerId: string; profile?: ComplianceValues | null }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(saveComplianceProfile, initialActionState);
  return (
    <form action={action} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <input type="hidden" name="partnerId" value={partnerId} />
      <h2 className="text-lg font-semibold text-ink">{t('Compliance profile')}</h2>
      <div className={grid}>
        <div><label htmlFor="voltage" className={label}>{t('Voltage')}</label><input id="voltage" name="voltage" defaultValue={profile?.voltage ?? ''} className={control} /></div>
        <div><label htmlFor="frequency" className={label}>{t('Frequency')}</label><input id="frequency" name="frequency" defaultValue={profile?.frequency ?? ''} className={control} /></div>
        <div><label htmlFor="phase" className={label}>{t('Phase')}</label><input id="phase" name="phase" defaultValue={profile?.phase ?? ''} className={control} /></div>
        <div><label htmlFor="ceVariant" className={label}>{t('CE variant')}</label><input id="ceVariant" name="ceVariant" defaultValue={profile?.ceVariant ?? ''} className={control} /></div>
        <div><label htmlFor="labelLanguages" className={label}>{t('Label languages')}</label><input id="labelLanguages" name="labelLanguages" defaultValue={profile?.labelLanguages?.join(', ') ?? ''} placeholder="Turkish, English" className={control} /></div>
        <div><label htmlFor="colourCodes" className={label}>{t('Colour codes')}</label><input id="colourCodes" name="defaultColourCodes" defaultValue={profile?.defaultColourCodes?.join(', ') ?? ''} className={control} /></div>
      </div>
      <label className="flex items-center gap-3 text-sm text-ink"><input type="checkbox" name="nameplateRequired" defaultChecked={profile?.nameplateRequired ?? false} className="h-4 w-4" />{t('Agent nameplate applied')}</label>
      <Feedback state={state} />
      <button disabled={pending} type="submit" className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">{t('Save profile')}</button>
    </form>
  );
}

export type ModelValues = {
  id: string; code: string; nameEn: string; nameZh: string; productLine: string | null; isActive: boolean;
};

export function MachineModelForm({ model }: { model?: ModelValues }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(saveMachineModel, initialActionState);
  return (
    <form action={action} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {model && <input type="hidden" name="id" value={model.id} />}
      <div className={grid}>
        <div><label htmlFor="model-code" className={label}>{t('Code')}</label><input id="model-code" name="code" defaultValue={model?.code} required className={control} /></div>
        <div><label htmlFor="model-line" className={label}>{t('Product line')}</label><input id="model-line" name="productLine" defaultValue={model?.productLine ?? ''} className={control} /></div>
        <div><label htmlFor="model-en" className={label}>{t('English name')}</label><input id="model-en" name="nameEn" defaultValue={model?.nameEn} required className={control} /></div>
        <div><label htmlFor="model-zh" className={label}>{t('Chinese name')}</label><input id="model-zh" name="nameZh" defaultValue={model?.nameZh} required className={control} /></div>
      </div>
      <label className="flex items-center gap-3 text-sm text-ink"><input type="checkbox" name="isActive" defaultChecked={model?.isActive ?? true} className="h-4 w-4" />{t('Active model')}</label>
      <Feedback state={state} />
      <button disabled={pending} type="submit" className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">{model ? t('Save changes') : t('Add machine model')}</button>
    </form>
  );
}

export type ItemValues = {
  id: string; code: string; nameEn: string; nameZh: string;
  itemType: (typeof itemTypes)[number]; specCategoryId: string | null;
  machineModelId: string | null; unit: string; isStandardAccessory: boolean;
  specOverride: { valueEn: string; valueZh: string } | null;
};

type Choice = { id: string; code: string; nameEn?: string };

export function ItemForm({ item, categories, models }: { item?: ItemValues; categories: Choice[]; models: Choice[] }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(saveItem, initialActionState);
  const [itemType, setItemType] = useState<(typeof itemTypes)[number]>(item?.itemType ?? 'accessory');
  return (
    <form action={action} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className={grid}>
        <div><label htmlFor="item-code" className={label}>{t('Code')}</label><input id="item-code" name="code" defaultValue={item?.code} required className={control} /></div>
        <div><label htmlFor="item-type" className={label}>{t('TYPE')}</label><select id="item-type" name="itemType" value={itemType} onChange={(event) => setItemType(event.target.value as (typeof itemTypes)[number])} className={control}><SelectOptions values={itemTypes} /></select></div>
        <div><label htmlFor="item-en" className={label}>{t('English name')}</label><input id="item-en" name="nameEn" defaultValue={item?.nameEn} required className={control} /></div>
        <div><label htmlFor="item-zh" className={label}>{t('Chinese name')}</label><input id="item-zh" name="nameZh" defaultValue={item?.nameZh} required className={control} /></div>
        <div><label htmlFor="item-category" className={label}>{t('Spec category')}</label><select id="item-category" name="specCategoryId" defaultValue={item?.specCategoryId ?? ''} className={control}><option value="">—</option>{categories.map((choice) => <option key={choice.id} value={choice.id}>{choice.nameEn ?? choice.code}</option>)}</select></div>
        <div><label htmlFor="item-model" className={label}>{t('Machine model')}</label><select id="item-model" name="machineModelId" defaultValue={item?.machineModelId ?? ''} className={control}><option value="">{t('All models')}</option>{models.map((choice) => <option key={choice.id} value={choice.id}>{choice.code}</option>)}</select></div>
        <div><label htmlFor="item-unit" className={label}>{t('Unit')}</label><input id="item-unit" name="unit" defaultValue={item?.unit ?? 'set'} required className={control} /></div>
      </div>
      {itemType === 'spec_change' && <div className={grid}>
        <div><label htmlFor="override-en" className={label}>{t('English replacement value')}</label><textarea id="override-en" name="specOverrideEn" rows={3} defaultValue={item?.specOverride?.valueEn ?? ''} required className={control} /></div>
        <div><label htmlFor="override-zh" className={label}>{t('Chinese replacement value')}</label><textarea id="override-zh" name="specOverrideZh" rows={3} defaultValue={item?.specOverride?.valueZh ?? ''} required className={control} /></div>
      </div>}
      <label className="flex items-center gap-3 text-sm text-ink"><input type="checkbox" name="isStandardAccessory" defaultChecked={item?.isStandardAccessory ?? false} className="h-4 w-4" />{t('Standard accessory')}</label>
      <Feedback state={state} />
      <button disabled={pending} type="submit" className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">{item ? t('Save changes') : t('Add item')}</button>
    </form>
  );
}

export type VersionValues = {
  id: string; name: string; effectiveFrom: string; effectiveTo: string | null; isPublished: boolean;
};

export function PriceBookVersionForm({ version }: { version?: VersionValues }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(savePriceBookVersion, initialActionState);
  if (version?.isPublished) return <p className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-muted">{t('Published price books are read only')}</p>;
  return (
    <form action={action} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {version && <input type="hidden" name="id" value={version.id} />}
      <div className={grid}>
        <div><label htmlFor="version-name" className={label}>{t('Name')}</label><input id="version-name" name="name" defaultValue={version?.name} required className={control} /></div>
        <div><label htmlFor="version-from" className={label}>{t('Effective from')}</label><input id="version-from" name="effectiveFrom" type="date" defaultValue={version?.effectiveFrom} required className={control} /></div>
        <div><label htmlFor="version-to" className={label}>{t('Effective to')}</label><input id="version-to" name="effectiveTo" type="date" defaultValue={version?.effectiveTo ?? ''} className={control} /></div>
      </div>
      <Feedback state={state} />
      <button disabled={pending} type="submit" className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">{version ? t('Save changes') : t('Add price book draft')}</button>
    </form>
  );
}

