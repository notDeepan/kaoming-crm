import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { PageHeader } from '@/components/page-header';
import {
  addLineAction, approveDiscountAction, designReviewAction, generateProposalAction, issueQuotationAction,
  newRevisionAction, proposalUploadAction, refreshDraftPricesAction, removeLineAction, saveTermsAction,
} from '@/features/deals/actions';
import { getDeal, getQuotationDetail, listPricedItems, listQuoteRevisions } from '@/features/deals/queries';
import { requireUser } from '@/lib/authorization';

const control = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm';
const card = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm';
const button = 'rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700';

export default async function DealPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ quote?: string; error?: string; notice?: string }>;
}) {
  const [{ id }, query, user] = await Promise.all([params, searchParams, requireUser()]);
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [deal, revisions] = await Promise.all([getDeal(id), listQuoteRevisions(id)]);
  if (!deal) notFound();
  if (query.quote && !z.string().uuid().safeParse(query.quote).success) notFound();
  const selectedId = query.quote ?? revisions[0]?.id;
  if (query.quote && !revisions.some((revision) => revision.id === query.quote)) notFound();
  const detail = selectedId ? await getQuotationDetail(selectedId) : null;
  const pricedItems = detail?.quote.status === 'draft' ? await listPricedItems(detail.quote.id) : [];
  const canEdit = ['admin', 'manager', 'sales'].includes(user.role);
  const canReview = ['admin', 'manager'].includes(user.role);
  const quote = detail?.quote;
  return <div className="space-y-6">
    <Link href="/deals" className="text-sm text-brand hover:underline">← Deals</Link>
    <PageHeader eyebrow="DEAL / 報價" title={`${deal.dealNumber} · ${deal.partnerName}${deal.customerName ? ` / ${deal.customerName}` : ''}`}
      description={`${deal.modelCode ?? 'Model pending'} · ${deal.regionBand === 'eu' ? 'EU' : 'Non EU'} · ${deal.currency} · enquiry ${deal.enquiryDate}`} />
    <nav className="flex flex-wrap gap-5 border-b border-slate-200 text-sm"><span className="border-b-2 border-brand pb-3 font-semibold">Quotations</span><Link href={`/deals/${id}/configuration`} className="pb-3 text-muted hover:text-brand">Configuration</Link><Link href={`/deals/${id}/order`} className="pb-3 text-muted hover:text-brand">PI 訂單</Link><Link href={`/deals/${id}/manufacturing`} className="pb-3 text-muted hover:text-brand">MI 製令單</Link><Link href={`/deals/${id}/production`} className="pb-3 text-muted hover:text-brand">Production</Link><Link href={`/deals/${id}/delivery`} className="pb-3 text-muted hover:text-brand">Delivery</Link></nav>
    {query.error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{query.error}</p>}
    {query.notice && <p role="status" className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">{query.notice}</p>}
    <div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside className={card}>
        <h2 className="font-semibold">Revisions</h2>
        <div className="mt-4 space-y-2">{revisions.map((revision) => <Link key={revision.id}
          href={`/deals/${id}?quote=${revision.id}`}
          className={`block rounded-md border p-3 text-sm ${selectedId === revision.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
          <span className="font-semibold">r{revision.revision}</span><span className="float-right text-xs capitalize">{revision.status.replaceAll('_', ' ')}</span>
          <span className="mt-1 block text-xs text-muted">{revision.issuedAt?.toISOString().slice(0, 10) ?? revision.createdAt.toISOString().slice(0, 10)}</span>
        </Link>)}</div>
        {canEdit && (!revisions.length || revisions[0]?.status !== 'draft') && <form action={newRevisionAction} className="mt-5"><input type="hidden" name="dealId" value={id} /><button className={button}>{revisions.length ? 'New revision' : 'Start quotation'}</button></form>}
      </aside>
      <div className="min-w-0 space-y-5">
        {!detail && <div className={card}><p className="text-sm text-muted">Start a quotation to add priced machine and option lines.</p></div>}
        {detail && <>
          <section className={card}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs uppercase tracking-widest text-muted">Quotation r{quote!.revision} · {quote!.priceBookName}</p>
                <h2 className="mt-1 text-xl font-semibold">{deal.modelName ?? 'Machine selection pending'}</h2>
                <p className="mt-1 text-sm text-muted">{quote!.status.replaceAll('_', ' ')}{quote!.validUntil ? ` · valid to ${quote!.validUntil}` : ''}</p>
              </div>
              <a href={`/api/quotations/${quote!.id}/pdf`} target="_blank" rel="noreferrer" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Print quotation</a>
            </div>
            <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-muted"><tr><th className="pb-3">Item</th><th className="pb-3">Type</th><th className="pb-3 text-right">Qty</th><th className="pb-3 text-right">Unit {deal.currency}</th><th className="pb-3 text-right">Line discount</th><th className="pb-3 text-right">Total</th>{quote!.status === 'draft' && canEdit && <th className="pb-3" />}</tr></thead>
              <tbody className="divide-y divide-slate-100">{detail.lines.map((line) => <tr key={line.id}>
                <td className="py-3 pr-4"><span className="font-medium">{line.descriptionEn}</span><span className="block text-xs text-muted">{line.itemCode} · {line.descriptionZh}</span></td>
                <td className="py-3 text-xs capitalize">{line.itemType.replaceAll('_', ' ')}</td><td className="py-3 text-right tabular-nums">{line.quantity}</td>
                <td className="py-3 text-right tabular-nums">{line.unitPrice}</td><td className="py-3 text-right tabular-nums">{line.lineDiscount}</td>
                <td className="py-3 text-right font-medium tabular-nums">{line.isIncludedInTotal ? line.lineTotal : 'Not included'}</td>
                {quote!.status === 'draft' && canEdit && <td className="py-3 pl-3"><form action={removeLineAction}><input type="hidden" name="dealId" value={id} /><input type="hidden" name="lineId" value={line.id} /><button className="text-xs text-red-700 hover:underline">Remove</button></form></td>}
              </tr>)}</tbody></table></div>
            <div className="mt-5 border-t border-slate-200 pt-4 text-right text-sm"><p>List total <span className="ml-4 font-mono">{deal.currency} {quote!.listTotal}</span></p><p className="mt-1">Line discounts <span className="ml-4 font-mono">− {quote!.discountAmount}</span></p><p className="mt-2 text-lg font-semibold">Net total <span className="ml-4 font-mono">{deal.currency} {quote!.netTotal}</span></p></div>
          </section>
          {quote!.status === 'draft' && canEdit && <section className={card}>
            <h2 className="font-semibold">Add priced line</h2>
            <form action={refreshDraftPricesAction} className="mt-3"><input type="hidden" name="dealId" value={id} /><input type="hidden" name="quoteId" value={quote!.id} /><button className="text-xs font-semibold text-brand underline">Refresh prices from the current published book</button></form>
            <form action={addLineAction} className="mt-4 grid gap-4 md:grid-cols-[minmax(0,2fr)_100px_130px_auto_auto] md:items-end">
              <input type="hidden" name="dealId" value={id} /><input type="hidden" name="quoteId" value={quote!.id} />
              <label className="text-xs font-medium">Price book item<select name="itemId" required className={control}><option value="">Select item</option>{pricedItems.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.nameEn} · {deal.currency} {item.amount}</option>)}</select></label>
              <label className="text-xs font-medium">Quantity<input name="quantity" required defaultValue="1" inputMode="decimal" className={control} /></label>
              <label className="text-xs font-medium">Discount {deal.currency}<input name="lineDiscount" required defaultValue="0" inputMode="decimal" className={control} /></label>
              <label className="flex items-center gap-2 pb-2 text-xs"><input name="included" type="checkbox" defaultChecked />Included</label>
              <button className={button}>Add line</button>
            </form>
            <p className="mt-3 text-xs text-muted">Untick “Included” for priced options offered separately. The line stays visible but does not affect the total.</p>
          </section>}
          <section className={card}>
            <h2 className="font-semibold">Commercial terms</h2>
            <form action={saveTermsAction} className="mt-4 grid gap-4 md:grid-cols-2">
              <input type="hidden" name="dealId" value={id} /><input type="hidden" name="quoteId" value={quote!.id} />
              <label className="text-xs font-medium">Payment terms<textarea name="paymentTerms" defaultValue={quote!.paymentTerms ?? ''} disabled={quote!.status !== 'draft' || !canEdit} rows={2} className={control} /></label>
              <label className="text-xs font-medium">Delivery terms<textarea name="deliveryTerms" defaultValue={quote!.deliveryTerms ?? ''} disabled={quote!.status !== 'draft' || !canEdit} rows={2} className={control} /></label>
              <label className="text-xs font-medium">Lead time promise<input name="leadTimeText" defaultValue={quote!.leadTimeText ?? ''} disabled={quote!.status !== 'draft' || !canEdit} className={control} /></label>
              <label className="text-xs font-medium">Incoterm<select name="incoterm" defaultValue={quote!.incoterm} disabled={quote!.status !== 'draft' || !canEdit} className={control}>{['EXW', 'FOB', 'CFR', 'CIF', 'CIP', 'DAP', 'DDP'].map((term) => <option key={term}>{term}</option>)}</select></label>
              <label className="text-xs font-medium">Lead time from<select name="leadTimeWeeksFrom" defaultValue={quote!.leadTimeWeeksFrom} disabled={quote!.status !== 'draft' || !canEdit} className={control}><option value="deposit">Deposit</option><option value="po">Purchase order</option></select></label>
              <label className="text-xs font-medium">Lead time ends at<select name="leadTimeEndsAt" defaultValue={quote!.leadTimeEndsAt} disabled={quote!.status !== 'draft' || !canEdit} className={control}><option value="ready_to_ship">Ready to ship</option><option value="arrived">Arrived</option></select></label>
              <label className="text-xs font-medium">Warranty months<input type="number" name="warrantyMonths" min="0" max="120" defaultValue={quote!.warrantyMonths} disabled={quote!.status !== 'draft' || !canEdit} className={control} /></label>
              {quote!.status === 'draft' && canEdit && <div className="flex items-end"><button className={button}>Save terms</button></div>}
            </form>
          </section>
          <section className={card}>
            <h2 className="font-semibold">Issue controls</h2>
            <div className="mt-3 grid gap-4 text-sm md:grid-cols-3">
              <div className="rounded-md bg-slate-50 p-3"><strong>G1 · Design review</strong><span className="mt-1 block text-muted">{detail.review ? `${detail.review.outcome} · ${detail.review.reviewedBy}` : 'Pending'}</span></div>
              <div className="rounded-md bg-slate-50 p-3"><strong>G1 · Technical proposal</strong><span className="mt-1 block text-muted">{detail.proposal ? <a href={detail.proposal.pdfUrl} target="_blank" rel="noreferrer" className="text-brand underline">PDF attached</a> : 'Pending'}</span></div>
              <div className="rounded-md bg-slate-50 p-3"><strong>G2 · Discount</strong><span className="mt-1 block text-muted">{Number(quote!.discountAmount) === 0 ? 'No discount' : `${detail.approvals.map((approval) => approval.stage.replace('_', ' ')).join(' → ') || 'Pending approvals'}`}</span></div>
            </div>
            {quote!.status === 'draft' && canReview && <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <form action={designReviewAction} className="space-y-3 rounded-md border border-slate-200 p-4"><h3 className="font-medium">Record design review</h3><input type="hidden" name="dealId" value={id} /><input type="hidden" name="quoteId" value={quote!.id} />
                <label className="block text-xs">Engineer name<input name="reviewedBy" required className={control} /></label>
                <label className="block text-xs">Outcome<select name="outcome" className={control}><option value="confirmed">Confirmed</option><option value="rejected">Rejected</option></select></label>
                <label className="block text-xs">Notes<textarea name="notes" rows={2} className={control} /></label><button className={button}>Record review</button>
              </form>
              <div className="space-y-3 rounded-md border border-slate-200 p-4"><h3 className="font-medium">Technical proposal for r{quote!.revision}</h3>
                <p className="text-xs text-muted">Merge the model literature, resolved configuration and this deal’s terms. The worked-example model PDF must be replaced before external use.</p>
                <form action={generateProposalAction}><input type="hidden" name="dealId" value={id} /><input type="hidden" name="quoteId" value={quote!.id} /><button className={button}>Generate three-part proposal</button></form>
                <form action={proposalUploadAction} className="space-y-2 border-t border-slate-200 pt-3"><label className="block text-xs">Engineering-supplied PDF for this revision<input name="proposal" type="file" accept="application/pdf,.pdf" required className={control} /></label><input type="hidden" name="dealId" value={id} /><input type="hidden" name="quoteId" value={quote!.id} /><button className="text-sm text-brand underline">Attach engineering PDF</button></form>
              </div>
            </div>}
            {quote!.status === 'draft' && canReview && Number(quote!.discountAmount) > 0 && <div className="mt-5 flex flex-wrap gap-3">
              <form action={approveDiscountAction}><input type="hidden" name="dealId" value={id} /><input type="hidden" name="quoteId" value={quote!.id} /><input type="hidden" name="stage" value="dept_manager" /><button className={button}>Department manager approval</button></form>
              <form action={approveDiscountAction}><input type="hidden" name="dealId" value={id} /><input type="hidden" name="quoteId" value={quote!.id} /><input type="hidden" name="stage" value="gm" /><button className={button}>GM approval</button></form>
            </div>}
            {quote!.status === 'draft' && canReview && <form action={issueQuotationAction} className="mt-5 border-t border-slate-200 pt-5"><input type="hidden" name="dealId" value={id} /><input type="hidden" name="quoteId" value={quote!.id} /><button className={button}>Issue final quotation</button></form>}
          </section>
        </>}
      </div>
    </div>
  </div>;
}
