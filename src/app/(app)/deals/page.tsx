import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/page-header';
import { listDeals } from '@/features/deals/queries';
import { requireUser } from '@/lib/authorization';

export default async function DealsPage() {
  const [t, rows, user] = await Promise.all([getTranslations(), listDeals(), requireUser()]);
  const canEdit = ['admin', 'manager', 'sales'].includes(user.role);
  return <div>
    <PageHeader eyebrow="SALES / 商機" title={t('Deals')} description="One opportunity per machine, with a permanent quotation revision history." action={canEdit ? { href: '/deals/new', label: 'New deal' } : undefined} />
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>
          <th className="px-5 py-3">Deal</th><th className="px-5 py-3">Partner / customer</th>
          <th className="px-5 py-3">Machine</th><th className="px-5 py-3">Stage</th><th className="px-5 py-3">Enquiry</th>
        </tr></thead>
        <tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id} className="hover:bg-slate-50">
          <td className="px-5 py-4 font-mono font-semibold text-brand"><Link href={`/deals/${row.id}`} className="hover:underline">{row.dealNumber}</Link></td>
          <td className="px-5 py-4 font-medium">{row.partnerName}<span className="block text-xs font-normal text-muted">{row.customerName ?? 'Customer undisclosed'}</span></td>
          <td className="px-5 py-4">{row.modelCode ?? 'To be confirmed'}</td>
          <td className="px-5 py-4">{row.salesStage.replaceAll('_', ' ')}</td>
          <td className="px-5 py-4 font-mono text-xs">{row.enquiryDate}</td>
        </tr>)}</tbody>
      </table>
      {rows.length === 0 && <p className="p-10 text-center text-sm text-muted">No deals yet. Create one to begin a quotation.</p>}
    </div>
  </div>;
}
