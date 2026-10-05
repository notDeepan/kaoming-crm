import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { createDealAction } from '@/features/deals/actions';
import { listDealFormOptions } from '@/features/deals/queries';
import { requireRole } from '@/lib/authorization';

const control = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm';

export default async function NewDealPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [options, query] = await Promise.all([listDealFormOptions(), searchParams]);
  await requireRole('admin', 'manager', 'sales');
  return <div className="max-w-4xl space-y-6">
    <Link href="/deals" className="text-sm text-brand hover:underline">← Deals</Link>
    <PageHeader eyebrow="SALES / 商機" title="New deal" description="Create the opportunity first. The quotation number is assigned automatically." />
    {query.error && <p role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-800">{query.error}</p>}
    <form action={createDealAction} className="grid gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
      <label className="text-sm font-medium">Partner<select name="partnerId" required className={control}><option value="">Select partner</option>{options.partners.map((row) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select></label>
      <label className="text-sm font-medium">End customer<select name="customerId" className={control}><option value="">Not yet disclosed</option>{options.customers.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
      <label className="text-sm font-medium">Machine model<select name="machineModelId" className={control}><option value="">To be confirmed</option>{options.models.map((row) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select></label>
      <label className="text-sm font-medium">Enquiry date<input type="date" name="enquiryDate" required defaultValue={new Date().toISOString().slice(0, 10)} className={control} /></label>
      <label className="text-sm font-medium">Price region<select name="regionBand" defaultValue="non_eu" className={control}><option value="non_eu">Non EU</option><option value="eu">EU</option></select></label>
      <label className="text-sm font-medium">Currency<select name="currency" defaultValue="USD" className={control}><option value="USD">USD</option><option value="TWD">TWD</option></select></label>
      <div className="md:col-span-2"><button className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white">Create deal</button></div>
    </form>
  </div>;
}
