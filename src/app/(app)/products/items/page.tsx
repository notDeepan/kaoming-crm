import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ItemForm } from '@/components/master-data-forms';
import { ArchiveForm } from '@/components/archive-form';
import { PageHeader } from '@/components/page-header';
import { archiveItem } from '@/features/master-data/actions';
import { listItems, listMachineModels, listSpecCategories } from '@/features/master-data/queries';
import { requireUser } from '@/lib/authorization';

export default async function ItemsPage({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string }> }) {
  const [t, rows, models, categories, user, query] = await Promise.all([
    getTranslations(), listItems(), listMachineModels(), listSpecCategories(), requireUser(), searchParams,
  ]);
  const canEdit = user.role === 'admin' || user.role === 'manager';
  if (query.edit && !z.string().uuid().safeParse(query.edit).success) notFound();
  const selected = query.edit ? rows.find((row) => row.id === query.edit) : undefined;
  if (query.edit && !selected) notFound();
  const selectableModels = models.filter((model) => model.isActive || model.id === selected?.machineModelId);
  return (
    <div className="space-y-7">
      <Link href="/products" className="text-sm text-brand hover:underline">← {t('Products')}</Link>
      <PageHeader eyebrow="PRODUCT MASTER / 品名" title={t('Items')} description={t('Items page description')} action={canEdit ? { href: '/products/items?new=1', label: t('Add item') } : undefined} />
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">{t('Code')}</th><th className="px-5 py-3">{t('English name')}</th><th className="px-5 py-3">{t('Chinese name')}</th><th className="px-5 py-3">{t('TYPE')}</th><th className="px-5 py-3">{t('Unit')}</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id} className="hover:bg-slate-50"><td className="px-5 py-4 font-mono text-xs text-brand">{canEdit ? <Link href={`?edit=${row.id}`} className="hover:underline">{row.code}</Link> : row.code}</td><td className="px-5 py-4">{row.nameEn}</td><td className="px-5 py-4">{row.nameZh}</td><td className="px-5 py-4"><span className="rounded bg-slate-100 px-2 py-1 text-xs">{t(row.itemType)}</span></td><td className="px-5 py-4">{row.unit}</td></tr>)}</tbody>
        </table>
        {rows.length === 0 && <div className="p-10 text-center text-sm text-muted">{t('No records yet')}</div>}
      </div>
      {canEdit && (query.new || selected) && <div className="max-w-4xl"><h2 className="mb-4 text-xl font-semibold">{selected ? t('Edit record') : t('New record')}</h2><ItemForm key={selected?.id ?? 'new'} item={selected} models={selectableModels} categories={categories} /></div>}
      {canEdit && selected && <ArchiveForm id={selected.id} action={archiveItem} />}
    </div>
  );
}

