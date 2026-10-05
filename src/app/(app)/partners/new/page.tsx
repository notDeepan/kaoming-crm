import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { PartnerForm } from '@/components/master-data-forms';
import { PageHeader } from '@/components/page-header';
import { requireUser } from '@/lib/authorization';

export default async function NewPartnerPage() {
  const [t, user] = await Promise.all([getTranslations(), requireUser()]);
  if (user.role !== 'admin' && user.role !== 'manager') notFound();
  return (
    <div className="max-w-4xl">
      <Link href="/partners" className="mb-4 inline-block text-sm text-brand hover:underline">← {t('Back to list')}</Link>
      <PageHeader eyebrow="CHANNEL / 代理商" title={t('Add partner')} />
      <PartnerForm />
    </div>
  );
}
