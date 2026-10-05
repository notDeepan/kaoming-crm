import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/page-header';
import { listPartners } from '@/features/master-data/queries';
import { requireUser } from '@/lib/authorization';

export default async function PartnersPage() {
  const [t, rows, user] = await Promise.all([getTranslations(), listPartners(), requireUser()]);
  const canEdit = user.role === 'admin' || user.role === 'manager';
  return (
    <div>
      <PageHeader eyebrow="CHANNEL / 代理商" title={t('Agents')} description={t('Partner page description')} action={canEdit ? { href: '/partners/new', label: t('Add partner') } : undefined} />
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>
            <th className="px-5 py-3">{t('Code')}</th><th className="px-5 py-3">{t('Name')}</th><th className="px-5 py-3">{t('Country code')}</th><th className="px-5 py-3">{t('Commission model')}</th><th className="px-5 py-3">{t('Lifecycle status')}</th><th className="px-5 py-3">{t('Compliance profile')}</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => <tr key={row.id} className="hover:bg-slate-50">
              <td className="px-5 py-4 font-mono text-xs text-brand"><Link href={`/partners/${row.id}`} className="underline-offset-4 hover:underline">{row.code}</Link></td>
              <td className="px-5 py-4 font-medium"><Link href={`/partners/${row.id}`} className="underline-offset-4 hover:underline">{row.name}</Link>{row.nameZh && <div className="mt-1 text-xs text-muted">{row.nameZh}</div>}</td>
              <td className="px-5 py-4">{row.countryCode}</td>
              <td className="px-5 py-4">{row.commissionModel === 'markup' ? t('Mark-up') : t('Commission')}</td>
              <td className="px-5 py-4">{t(row.lifecycleStatus)}</td>
              <td className="px-5 py-4"><span className={row.isComplianceComplete ? 'text-green-700' : 'text-amber-700'}>{row.isComplianceComplete ? t('Complete') : t('Incomplete')}</span></td>
            </tr>)}
          </tbody>
        </table>
        {rows.length === 0 && <div className="px-5 py-12 text-center text-sm text-muted">{t('No records yet')}</div>}
      </div>
    </div>
  );
}

