import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { MachineModelForm } from '@/components/master-data-forms';
import { PageHeader } from '@/components/page-header';
import { saveBaseSpecsAction, uploadModelAssetAction } from '@/features/master-data/model-asset-actions';
import { getMachineModel, listMachineModels, listSpecCategories } from '@/features/master-data/queries';
import { requireUser } from '@/lib/authorization';

export default async function ModelsPage({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string; error?: string; notice?: string }> }) {
  const [t, rows, user, query] = await Promise.all([getTranslations(), listMachineModels(), requireUser(), searchParams]);
  const canEdit = user.role === 'admin' || user.role === 'manager';
  if (query.edit && !z.string().uuid().safeParse(query.edit).success) notFound();
  const selected = query.edit ? rows.find((row) => row.id === query.edit) : undefined;
  if (query.edit && !selected) notFound();
  const [model, categories] = selected ? await Promise.all([getMachineModel(selected.id), listSpecCategories()]) : [null, []];
  const baseCategories = categories.filter((category) => !['electrical', 'compliance', 'colour'].includes(category.code));
  return (
    <div className="space-y-7">
      <Link href="/products" className="text-sm text-brand hover:underline">← {t('Products')}</Link>
      <PageHeader eyebrow="PRODUCT MASTER / 機型" title={t('Machine models')} action={canEdit ? { href: '/products/models?new=1', label: t('Add machine model') } : undefined} />
      {query.error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{query.error}</p>}
      {query.notice && <p role="status" className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">{query.notice}</p>}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">{t('Code')}</th><th className="px-5 py-3">{t('English name')}</th><th className="px-5 py-3">{t('Chinese name')}</th><th className="px-5 py-3">{t('Product line')}</th><th className="px-5 py-3">{t('STATUS')}</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id} className="hover:bg-slate-50"><td className="px-5 py-4 font-mono text-xs text-brand">{canEdit ? <Link href={`?edit=${row.id}`} className="hover:underline">{row.code}</Link> : row.code}</td><td className="px-5 py-4">{row.nameEn}</td><td className="px-5 py-4">{row.nameZh}</td><td className="px-5 py-4">{row.productLine ?? '—'}</td><td className="px-5 py-4">{row.isActive ? t('Active') : t('Inactive')}</td></tr>)}</tbody>
        </table>
        {rows.length === 0 && <div className="p-10 text-center text-sm text-muted">{t('No records yet')}</div>}
      </div>
      {canEdit && (query.new || selected) && <div className="max-w-4xl"><h2 className="mb-4 text-xl font-semibold">{selected ? t('Edit record') : t('New record')}</h2><MachineModelForm key={selected?.id ?? 'new'} model={selected} /></div>}
      {canEdit && model && <section className="max-w-4xl space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div><h2 className="text-lg font-semibold">Model literature · technical proposal Part A</h2>
          <p className="mt-1 text-sm text-muted">Upload the approved per-model PDF. Existing issued proposals retain their frozen copy.</p>
          <p className="mt-2 text-sm">Current: {model.proposalAssetUrl ? <a className="text-brand underline" href={model.proposalAssetUrl} target="_blank" rel="noreferrer">{model.proposalAssetName ?? (model.proposalAssetUrl.endsWith('.example.pdf') ? 'Worked-example PDF' : 'Open PDF')}</a> : 'No model PDF uploaded'}</p></div>
        <form action={uploadModelAssetAction} className="flex flex-wrap items-end gap-3"><input type="hidden" name="modelId" value={model.id} />
          <label className="text-sm font-medium">Approved model PDF<input name="proposal" type="file" accept="application/pdf,.pdf" required className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
          <button className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white">Upload model PDF</button></form>
      </section>}
      {canEdit && model && <section className="max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Bilingual base specifications</h2>
        <p className="mt-1 text-sm text-muted">Enter source-approved values for this model. Destination electricity, compliance and colour come from the agent profile.</p>
        <form action={saveBaseSpecsAction} className="mt-5 space-y-4"><input type="hidden" name="modelId" value={model.id} />
          {baseCategories.map((category) => <div key={category.code} className="grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-[180px_1fr_1fr]">
            <div className="text-sm font-semibold">{category.nameZh}<span className="block text-xs font-normal text-muted">{category.nameEn}</span></div>
            <label className="text-xs font-medium">English<textarea name={`spec_${category.code}_en`} rows={2} defaultValue={model.baseSpecs?.[category.code]?.valueEn ?? ''} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
            <label className="text-xs font-medium">中文<textarea name={`spec_${category.code}_zh`} rows={2} defaultValue={model.baseSpecs?.[category.code]?.valueZh ?? ''} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
          </div>)}
          <button className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white">Save base specifications</button>
        </form>
      </section>}
    </div>
  );
}

