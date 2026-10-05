import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { PageHeader } from '@/components/page-header';
import { priceSources } from '@/db/enums';
import { approvePartsQuotationAction, checkStockAction, completePartsTermsAction,
  decideAlternativeAction, draftPartsQuotationAction, identifyPartAction, issuePartsQuotationAction,
  recordPartPriceAction, requestIdentificationAction, requestPricingAction,
  suggestAlternativeAction } from '@/features/parts/actions';
import { getPartsRequest } from '@/features/parts/service';
import { requireUser } from '@/lib/authorization';

const card = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm';
const control = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm';
const button = 'rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white';
export default async function PartsRequestPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const [{ id }, query, user] = await Promise.all([params, searchParams, requireUser()]);
  if (!z.string().uuid().safeParse(id).success) notFound();
  const row = await getPartsRequest(id);
  if (!row) notFound();
  const request = row.request, quote = row.quotation;
  const canWork = ['admin', 'manager', 'logistics', 'service', 'sales'].includes(user.role);
  const canPrice = ['admin', 'manager', 'logistics'].includes(user.role);
  return <div className="space-y-6"><Link href="/aftermarket" className="text-sm text-brand underline">← Parts queue</Link>
    <PageHeader eyebrow="AFTERMARKET / 零件" title={`${request.requestNumber} · ${request.requestedDescription}`}
      description={`${row.partnerName} · ${row.serialNumber ?? 'machine unknown'} · quantity ${request.requestedQuantity}`} />
    {query.error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{query.error}</p>}
    {query.notice && <p role="status" className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">{query.notice}</p>}
    <section className={card}><h2 className="font-semibold">Request state · {request.status.replaceAll('_', ' ')}</h2>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-slate-500">Warranty determination</dt><dd className={request.warrantyDetermination === 'undeterminable' ? 'font-semibold text-amber-700' : ''}>{request.warrantyDetermination.replaceAll('_', ' ')}</dd></div>
        <div><dt className="text-slate-500">Part / alternative</dt><dd>{request.identifiedPartNumber ?? request.alternativePartNumber ?? 'Awaiting identification'}</dd></div>
        <div><dt className="text-slate-500">Stock</dt><dd>{request.inStock === null ? 'Not checked' : request.inStock ? 'In stock' : `Procurement · ${request.procurementLeadDays} days`}</dd></div></dl>
      {request.warrantyDetermination === 'undeterminable' && <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">Warranty cannot be determined until a machine acceptance date is recorded. Do not assume FOC eligibility.</p>}
      {canWork && request.status === 'requested' && <form action={requestIdentificationAction} className="mt-4"><input type="hidden" name="requestId" value={id} /><button className={button}>Request part identification from 售後</button></form>}
      {canWork && request.status === 'awaiting_identification' && <div className="mt-4 grid gap-4 md:grid-cols-2">
        <form action={identifyPartAction} className="rounded-lg border p-3"><h3 className="font-medium">Identified part</h3><input type="hidden" name="requestId" value={id} />
          <label className="mt-2 block text-sm">Part number<input name="partNumber" required className={control} /></label>
          <label className="mt-2 block text-sm">Identified by<input name="identifiedBy" required className={control} /></label><button className={`${button} mt-3`}>Record identification</button></form>
        <form action={suggestAlternativeAction} className="rounded-lg border p-3"><h3 className="font-medium">Part unavailable · suggest alternative</h3><input type="hidden" name="requestId" value={id} />
          <label className="mt-2 block text-sm">Alternative part number<input name="partNumber" required className={control} /></label>
          <label className="mt-2 block text-sm">Suggested by<input name="identifiedBy" required className={control} /></label><button className={`${button} mt-3`}>Suggest alternative</button></form></div>}
      {canWork && request.status === 'alternative_suggested' && <div className="mt-4 grid gap-3 md:grid-cols-2">
        <form action={decideAlternativeAction}><input type="hidden" name="requestId" value={id} /><input type="hidden" name="accepted" value="true" /><button className={button}>Customer accepted alternative</button></form>
        <form action={decideAlternativeAction}><input type="hidden" name="requestId" value={id} /><input type="hidden" name="accepted" value="false" />
          <label className="block text-sm">Rejection reason<input name="reason" required className={control} /></label><button className={`${button} mt-2`}>Record rejected alternative</button></form></div>}
      {canWork && ['identified', 'alternative_accepted'].includes(request.status) && <form action={checkStockAction} className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="requestId" value={id} /><label className="text-sm">In stock?<select name="inStock" className={control}><option value="true">Yes</option><option value="false">No</option></select></label>
        <label className="text-sm">Procurement lead days, if out of stock<input name="leadDays" type="number" min="1" max="365" className={control} /></label><button className={button}>Record stock check</button></form>}
      {canPrice && request.status === 'stock_checked' && <form action={requestPricingAction} className="mt-4"><input type="hidden" name="requestId" value={id} /><button className={button}>Request price from 採購 / 生管</button></form>}
      {canPrice && request.status === 'awaiting_pricing' && <form action={recordPartPriceAction} className="mt-4 grid gap-3 md:grid-cols-4"><input type="hidden" name="requestId" value={id} />
        <label className="text-sm">Unit price<input name="price" type="number" min="0" step="0.01" required className={control} /></label>
        <label className="text-sm">Currency<input name="currency" defaultValue="USD" maxLength={3} required className={control} /></label>
        <label className="text-sm">Source<select name="source" className={control}>{priceSources.map((source) => <option key={source} value={source}>{source.replaceAll('_', ' ')}</option>)}</select></label>
        <label className="text-sm">Priced by<input name="pricedBy" required className={control} /></label><div className="md:col-span-4"><button className={button}>Record price</button></div></form>}
      {canPrice && request.status === 'priced' && !quote && <form action={draftPartsQuotationAction} className="mt-4"><input type="hidden" name="requestId" value={id} /><button className={button}>Draft parts quotation</button></form>}
    </section>
    {quote && <section className={card}><h2 className="font-semibold">Quotation · {quote.quoteNumber}</h2>
      <p className="mt-2 text-sm">Status {quote.status.replaceAll('_', ' ')} · {quote.currency} {quote.total} {quote.isFoc ? '· FOC' : ''}
        · prepared by user {quote.preparedBy.slice(0, 8)}</p>
      {quote.status === 'draft' && ['admin', 'manager', 'logistics'].includes(user.role) && <form action={approvePartsQuotationAction} className="mt-4">
        <input type="hidden" name="requestId" value={id} /><input type="hidden" name="quotationId" value={quote.id} />
        <button className={button}>Approve quotation · G18</button><p className="mt-1 text-xs text-slate-500">The approver must differ from the preparer; logistics-prepared quotes require a manager.</p></form>}
      {quote.status === 'pending_approval' && canPrice && <form action={completePartsTermsAction} className="mt-4 grid gap-3 md:grid-cols-2">
        <input type="hidden" name="requestId" value={id} /><input type="hidden" name="quotationId" value={quote.id} />
        <label className="text-sm">Payment terms<input name="paymentTerms" defaultValue="T/T" required className={control} /></label>
        <label className="text-sm">Delivery terms<input name="deliveryText" defaultValue={request.inStock ? '3-5 days after receiving your order' : `After procurement · ${request.procurementLeadDays} days plus dispatch`} required className={control} /></label>
        <div className="md:col-span-2"><button className={button}>Complete terms · G8</button></div></form>}
      {quote.status === 'approved' && canPrice && <form action={issuePartsQuotationAction} className="mt-4"><input type="hidden" name="requestId" value={id} /><input type="hidden" name="quotationId" value={quote.id} /><button className={button}>Issue PDF quotation</button></form>}
      {quote.status === 'issued' && <a className="mt-4 inline-block text-sm font-medium text-brand underline" target="_blank" rel="noreferrer" href={`/api/parts-quotations/${quote.id}/pdf`}>Open issued PDF</a>}
    </section>}
  </div>;
}
