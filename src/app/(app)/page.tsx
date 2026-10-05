import Link from 'next/link';
import { and, count, eq, isNull, or } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/page-header';
import { getDb } from '@/db/client';
import { items, machineModels, partnerComplianceProfiles, partners, priceBookVersions } from '@/db/schema';
import { requireUser } from '@/lib/authorization';

export default async function HomePage() {
  const db = getDb();
  const [t, user, partnerRows, modelRows, itemRows, versionRows, publishedRows, incompleteRows, draftRows] = await Promise.all([
    getTranslations(),
    requireUser(),
    db.select({ total: count() }).from(partners).where(isNull(partners.deletedAt)),
    db.select({ total: count() }).from(machineModels).where(isNull(machineModels.deletedAt)),
    db.select({ total: count() }).from(items).where(isNull(items.deletedAt)),
    db.select({ total: count() }).from(priceBookVersions).where(isNull(priceBookVersions.deletedAt)),
    db.select({ total: count() }).from(priceBookVersions)
      .where(and(isNull(priceBookVersions.deletedAt), eq(priceBookVersions.isPublished, true))),
    db.select({ total: count() }).from(partners)
      .leftJoin(partnerComplianceProfiles, eq(partnerComplianceProfiles.partnerId, partners.id))
      .where(and(isNull(partners.deletedAt), or(isNull(partnerComplianceProfiles.id), eq(partnerComplianceProfiles.isComplete, false)))),
    db.select({ total: count() }).from(priceBookVersions)
      .where(and(isNull(priceBookVersions.deletedAt), eq(priceBookVersions.isPublished, false))),
  ]);
  const canManageCatalog = user.role === 'admin' || user.role === 'manager';
  const canCreateDeals = canManageCatalog || user.role === 'sales';
  const setup = [
    { label: t('Add an agent'), href: '/partners/new', ready: (partnerRows[0]?.total ?? 0) > 0 },
    { label: t('Add a machine model'), href: '/products/models?new=1', ready: (modelRows[0]?.total ?? 0) > 0 },
    { label: t('Add a bilingual item'), href: '/products/items?new=1', ready: (itemRows[0]?.total ?? 0) > 0 },
    { label: t('Publish a price book'), href: '/products/price-books/imports', ready: (publishedRows[0]?.total ?? 0) > 0 },
  ];
  const quotationReady = setup.every((step) => step.ready);
  const cards = [
    { label: t('Agents'), value: partnerRows[0]?.total ?? 0, href: '/partners' },
    { label: t('Machine models'), value: modelRows[0]?.total ?? 0, href: '/products/models' },
    { label: t('Items'), value: itemRows[0]?.total ?? 0, href: '/products/items' },
    { label: t('Price book versions'), value: versionRows[0]?.total ?? 0, href: '/products/price-books' },
  ];

  return (
    <div className="space-y-7">
      <PageHeader eyebrow={t('International Sales')} title={t('Overview')} description={t('Master data workspace')} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => <Link key={card.href} href={card.href} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-brand/40 hover:shadow-md">
          <p className="text-sm font-medium text-muted">{card.label}</p>
          <p className="mt-3 font-mono text-3xl font-semibold tabular-nums text-ink">{card.value}</p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-brand">{t('Open')} →</p>
        </Link>)}
      </div>
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">{t('Start making quotations')}</h2>
        <p className="mt-2 text-sm text-muted">{t('Records entered here can be reused in future quotations and reports')}</p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2">
          {setup.map((step, index) => <li key={step.href} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm">
            {canManageCatalog ? <Link href={step.href} className="font-medium text-brand underline">{index + 1}. {step.label}</Link>
              : <span className="font-medium">{index + 1}. {step.label}</span>}
            <span className={step.ready ? 'text-green-700' : 'text-amber-700'}>{t(step.ready ? 'Ready' : 'Needed')}</span>
          </li>)}
        </ol>
        {quotationReady && canCreateDeals && <Link href="/deals/new" className="mt-5 inline-block rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white">
          {t('Create a deal and quotation')}
        </Link>}
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">{t('Needs my action')}</h2>
        <div className="mt-4 divide-y divide-slate-100">
          <Link href="/partners" className="flex items-center justify-between gap-4 py-3 text-sm hover:text-brand">
            <span>{t('Incomplete destination profiles')}</span><strong className="font-mono tabular-nums text-amber-700">{incompleteRows[0]?.total ?? 0}</strong>
          </Link>
          {canManageCatalog && <Link href="/products/price-books" className="flex items-center justify-between gap-4 py-3 text-sm hover:text-brand">
            <span>{t('Price book drafts')}</span><strong className="font-mono tabular-nums text-amber-700">{draftRows[0]?.total ?? 0}</strong>
          </Link>}
        </div>
      </section>
    </div>
  );
}
