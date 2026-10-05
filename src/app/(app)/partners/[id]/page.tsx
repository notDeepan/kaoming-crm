import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ComplianceProfileForm, PartnerForm } from '@/components/master-data-forms';
import { PageHeader } from '@/components/page-header';
import { getPartner } from '@/features/master-data/queries';
import { requireUser } from '@/lib/authorization';

export default async function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [t, row, user] = await Promise.all([getTranslations(), getPartner(id), requireUser()]);
  if (!row) notFound();
  const canEdit = user.role === 'admin' || user.role === 'manager';
  const canEditCompliance = canEdit || user.role === 'sales';
  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/partners" className="inline-block text-sm text-brand hover:underline">← {t('Back to list')}</Link>
      <PageHeader eyebrow={`${row.code} / ${row.countryCode}`} title={row.name} description={row.nameZh ?? undefined} />
      {canEdit ? <PartnerForm partner={row} /> : <div className="rounded-xl border bg-white p-6 text-sm">{t(row.region)} · {row.commissionModel === 'markup' ? t('Mark-up') : t('Commission')} · {t(row.lifecycleStatus)}</div>}
      {canEditCompliance && <ComplianceProfileForm partnerId={row.id} profile={row.profile} />}
    </div>
  );
}
