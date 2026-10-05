import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { PriceBookVersionForm } from '@/components/master-data-forms';
import { ArchiveForm } from '@/components/archive-form';
import { PageHeader } from '@/components/page-header';
import { archivePriceBookDraft } from '@/features/master-data/actions';
import { listPriceBookVersions, listVersionPrices } from '@/features/master-data/queries';
import { requireUser } from '@/lib/authorization';

export default async function PriceBooksPage({ searchParams }: { searchParams: Promise<{ view?: string; new?: string }> }) {
  const [t, versions, user, query] = await Promise.all([getTranslations(), listPriceBookVersions(), requireUser(), searchParams]);
  const canEdit = user.role === 'admin' || user.role === 'manager';
  if (query.view && !z.string().uuid().safeParse(query.view).success) notFound();
  const selected = query.view ? versions.find((version) => version.id === query.view) : undefined;
  if (query.view && !selected) notFound();
  const priceRows = selected ? await listVersionPrices(selected.id) : [];
  return (
    <div className="space-y-7">
      <Link href="/products" className="text-sm text-brand hover:underline">← {t('Products')}</Link>
      <PageHeader eyebrow="PRICE CONTROL / 價目表" title={t('Price book versions')} description={t('Price books page description')} action={canEdit ? { href: '/products/price-books?new=1', label: t('Add price book draft') } : undefined} />
      {canEdit && <Link href="/products/price-books/imports" className="inline-block text-sm font-semibold text-brand underline">Upload and publish a price list →</Link>}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">{t('Name')}</th><th className="px-5 py-3">{t('Effective from')}</th><th className="px-5 py-3">{t('Effective to')}</th><th className="px-5 py-3">{t('STATUS')}</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{versions.map((version) => <tr key={version.id} className="hover:bg-slate-50"><td className="px-5 py-4 font-mono text-brand"><Link href={`?view=${version.id}`} className="hover:underline">{version.name}</Link></td><td className="px-5 py-4">{version.effectiveFrom}</td><td className="px-5 py-4">{version.effectiveTo ?? '—'}</td><td className="px-5 py-4">{version.isPublished ? t('Published') : t('Draft')}</td></tr>)}</tbody>
        </table>
        {versions.length === 0 && <div className="p-10 text-center text-sm text-muted">{t('No records yet')}</div>}
      </div>
      {canEdit && (query.new || selected && !selected.isPublished) && <div className="max-w-4xl"><h2 className="mb-4 text-xl font-semibold">{selected ? t('Edit record') : t('New record')}</h2><PriceBookVersionForm key={selected?.id ?? 'new'} version={selected} /></div>}
      {canEdit && selected && !selected.isPublished && <ArchiveForm id={selected.id} action={archivePriceBookDraft} />}
      {selected && <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="mb-4 text-lg font-semibold">{selected.name} · {t('Price list')}</h2><table className="w-full min-w-[600px] text-left text-sm"><thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="pb-3">{t('Code')}</th><th className="pb-3">{t('English name')}</th><th className="pb-3">{t('Region')}</th><th className="pb-3">{t('PRICE')}</th></tr></thead><tbody className="divide-y divide-slate-100">{priceRows.map((price) => <tr key={`${price.itemCode}-${t(price.regionBand)}-${price.currency}`}><td className="py-3 font-mono text-xs">{price.itemCode}</td><td className="py-3">{price.itemNameEn}<span className="block text-xs text-muted">{price.itemNameZh}</span></td><td className="py-3">{t(price.regionBand)}</td><td className="py-3 font-mono tabular-nums">{price.currency} {price.amount}</td></tr>)}</tbody></table>{priceRows.length === 0 && <p className="py-6 text-sm text-muted">{t('No records yet')}</p>}</div>}
    </div>
  );
}

