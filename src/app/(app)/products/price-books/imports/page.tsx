import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { PageHeader } from '@/components/page-header';
import { discardPriceImportAction, publishPriceImportAction, uploadPriceImportAction } from '@/features/price-book/actions';
import type { PriceDiff } from '@/features/price-book/import-data';
import { listPriceImports } from '@/features/price-book/service';

const card = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm';

export default async function PriceImportsPage({ searchParams }: { searchParams: Promise<{ view?: string; error?: string; notice?: string }> }) {
  const [rows, query] = await Promise.all([listPriceImports(), searchParams]);
  if (query.view && !z.string().uuid().safeParse(query.view).success) notFound();
  const selected = query.view ? rows.find((row) => row.id === query.view) : rows[0];
  if (query.view && !selected) notFound();
  const diff = selected?.diffSummary as (PriceDiff & { baselineVersionId: string | null }) | null;
  return <div className="space-y-6">
    <Link href="/products/price-books" className="text-sm text-brand hover:underline">← Price books</Link>
    <PageHeader eyebrow="PRICE CONTROL / 價目表" title="Price list imports" description="Upload, validate every row, review the movement, then publish an immutable version." />
    {query.error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{query.error}</p>}
    {query.notice && <p role="status" className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">{query.notice}</p>}
    <form action={uploadPriceImportAction} className={`${card} flex flex-wrap items-end gap-4`}>
      <label className="min-w-[260px] flex-1 text-sm font-medium">CSV or XLSX price list<input name="priceFile" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required className="mt-2 block w-full rounded-md border border-slate-300 p-2 text-sm" /></label>
      <button className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white">Upload and validate</button>
      <a href="/api/price-books/template" className="text-sm text-brand underline">Download template</a>
    </form>
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className={card}><h2 className="font-semibold">Import history</h2><div className="mt-4 space-y-2">{rows.map((row) => <Link key={row.id} href={`?view=${row.id}`}
        className={`block rounded-md border p-3 text-sm ${selected?.id === row.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}>
        <span className="block truncate font-medium">{row.filename}</span><span className="mt-1 block text-xs capitalize text-muted">{row.status} · {row.createdAt.toISOString().slice(0, 10)}</span>
      </Link>)}{rows.length === 0 && <p className="text-sm text-muted">No imports yet</p>}</div></aside>
      {selected && <div className="space-y-5">
        <section className={card}><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">{selected.filename}</h2><p className="mt-1 text-sm text-muted">{selected.rowCount ?? 0} rows · {selected.errorCount ?? 0} errors · {selected.status}</p></div>
          {['validated', 'failed'].includes(selected.status) && <form action={discardPriceImportAction}><input type="hidden" name="importId" value={selected.id} /><button className="text-sm text-red-700 hover:underline">Discard import</button></form>}
        </div>
          {selected.errors && selected.errors.length > 0 && <div className="mt-4 overflow-x-auto"><h3 className="font-medium text-red-800">Validation errors</h3><table className="mt-2 w-full text-left text-sm"><thead><tr><th className="py-2">Row</th><th className="py-2">Code</th><th className="py-2">Problem</th></tr></thead><tbody className="divide-y divide-slate-100">{selected.errors.map((error, index) => <tr key={`${error.row}-${error.code}-${index}`}><td className="py-2 font-mono">{error.row}</td><td className="py-2 font-mono text-red-700">{error.code}</td><td className="py-2">{error.message}</td></tr>)}</tbody></table></div>}
        </section>
        {diff && <section className={card}>
          <h2 className="font-semibold">Diff preview</h2>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">{[['Added', diff.added], ['Removed', diff.removed], ['Changed', diff.changed], ['Average movement', `${diff.averageMovementPercent.toFixed(1)}%`]].map(([label, value]) => <div key={label} className="rounded-md bg-slate-50 p-3"><span className="block text-xs text-muted">{label}</span><strong className="mt-1 block font-mono text-lg">{value}</strong></div>)}</div>
          {diff.removedOnOpenQuotations.length > 0 && <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">Removed items on open quotations: {diff.removedOnOpenQuotations.join(', ')}</p>}
          <h3 className="mt-5 font-medium">Largest price movements</h3>
          <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[550px] text-left text-sm"><thead className="border-b text-xs uppercase text-muted"><tr><th className="pb-2">Item</th><th className="pb-2">Band</th><th className="pb-2 text-right">Old</th><th className="pb-2 text-right">New</th><th className="pb-2 text-right">Move</th></tr></thead><tbody className="divide-y">{diff.largestMovements.map((movement) => <tr key={`${movement.itemCode}-${movement.regionBand}-${movement.currency}`}><td className="py-2 font-mono">{movement.itemCode}</td><td className="py-2">{movement.regionBand} {movement.currency}</td><td className="py-2 text-right font-mono">{movement.oldPrice}</td><td className="py-2 text-right font-mono">{movement.newPrice}</td><td className={`py-2 text-right font-mono ${Math.abs(movement.percent) > 25 ? 'font-bold text-amber-700' : ''}`}>{movement.percent.toFixed(1)}%</td></tr>)}</tbody></table>
            {diff.largestMovements.length === 0 && <p className="py-4 text-sm text-muted">No changed prices among items retained from the prior list.</p>}</div>
          {selected.status === 'validated' && <form action={publishPriceImportAction} className="mt-6 space-y-4 border-t border-slate-200 pt-5"><input type="hidden" name="importId" value={selected.id} />
            <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Version name<input name="name" required placeholder="2026-H2" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm font-medium">Effective from<input type="date" name="effectiveFrom" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label></div>
            <label className="flex items-start gap-2 text-sm"><input name="confirmed" type="checkbox" required className="mt-1" />I reviewed the added, removed, and changed prices and confirm this version.</label>
            <button className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white">Publish price book</button>
          </form>}
        </section>}
      </div>}
    </div>
  </div>;
}
