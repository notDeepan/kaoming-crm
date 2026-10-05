import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/page-header';

export default async function ProductsPage() {
  const t = await getTranslations();
  const entries = [
    { href: '/products/models', name: t('Machine models'), detail: t('Models card description') },
    { href: '/products/items', name: t('Items'), detail: t('Items card description') },
    { href: '/products/price-books', name: t('Price book versions'), detail: t('Price books card description') },
  ];
  return (
    <div>
      <PageHeader eyebrow="PRODUCT MASTER / 品項主檔" title={t('Products')} description={t('Products page description')} />
      <div className="grid gap-4 md:grid-cols-3">
        {entries.map((entry) => <Link key={entry.href} href={entry.href} className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-brand/40 hover:shadow-md">
          <div className="font-mono text-xs text-accent">{entry.href.split('/').at(-1)?.toUpperCase()}</div>
          <h2 className="mt-3 text-xl font-semibold text-ink group-hover:text-brand">{entry.name}</h2>
          <p className="mt-3 text-sm leading-6 text-muted">{entry.detail}</p>
        </Link>)}
      </div>
    </div>
  );
}
