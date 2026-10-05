'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { ReportFilters } from '@/queries/filters';

const reports = [
  ['a1', 'A1 · Overview'],
  ['d1', 'D1 · Order book'],
  ['a2', 'A2 · Revenue'],
  ['a3', 'A3 · Cash'],
  ['b1', 'B1 · Agents'],
  ['f1', 'F1 · Documents'],
  ['d2', 'D2 · Delays'],
  ['g1', 'G1 · Leakage'],
  ['b3', 'B3 · Coverage'],
  ['b2', 'B2 · Scorecard'],
  ['c1', 'C1 · Pipeline'],
  ['c2', 'C2 · Mix'],
  ['d3', 'D3 · Forecast'],
  ['e1', 'E1 · Warranty'],
  ['e2', 'E2 · Parts'],
  ['e3', 'E3 · Cases'],
  ['b4', 'B4 · Commission'],
  ['g2', 'G2 · Claims'],
] as const;
type Options = { agents: { id: string; name: string; country: string; region: string }[];
  models: { id: string; code: string }[]; countries: string[]; regions: string[]; currencies: string[] };

export function ReportFiltersBar({ filters, options, role }: { filters: ReportFilters; options: Options; role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const current = useSearchParams();
  const [country, setCountry] = useState(filters.country);
  const [region, setRegion] = useState(filters.region);
  const field = 'rounded-md border border-slate-300 bg-white px-2 py-2 text-sm';
  const query = current.toString();
  return <div className="space-y-4">
    <nav aria-label="Reports" className="flex flex-wrap gap-2">
      {reports.filter(([id]) => !['b1', 'b2', 'b3', 'b4', 'g1'].includes(id) || ['admin', 'manager', 'sales', 'finance'].includes(role)).map(([id, label]) => <Link key={id} href={`/reports/${id}${query ? `?${query}` : ''}`}
        aria-current={pathname.endsWith(`/${id}`) ? 'page' : undefined}
        className={`rounded-md px-3 py-2 text-sm font-medium ${pathname.endsWith(`/${id}`) ? 'bg-brand text-white' : 'border border-slate-300 bg-white text-brand hover:bg-slate-50'}`}>{label}</Link>)}
    </nav>
    <form onSubmit={(event) => {
      event.preventDefault();
      const params = new URLSearchParams();
      new FormData(event.currentTarget).forEach((value, key) => {
        if (typeof value === 'string') params.set(key, value);
      });
      router.push(`${pathname}?${params.toString()}`);
    }} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4 xl:grid-cols-5">
      <label className="grid gap-1 text-xs font-medium text-slate-600">From<input className={field} type="date" name="from" defaultValue={filters.from} required /></label>
      <label className="grid gap-1 text-xs font-medium text-slate-600">To<input className={field} type="date" name="to" defaultValue={filters.to} required /></label>
      <label className="grid gap-1 text-xs font-medium text-slate-600">Date basis<select className={field} name="basis" defaultValue={filters.basis}>
        <option value="order">Order / enquiry</option><option value="shipment">Shipment</option>
        <option value="acceptance">Acceptance</option><option value="payment">Payment</option>
      </select></label>
      <label className="grid gap-1 text-xs font-medium text-slate-600">Country<select className={field} name="country" value={country}
        onChange={(event) => { const value = event.target.value; setCountry(value);
          setRegion(value ? options.agents.find((agent) => agent.country === value)?.region ?? '' : ''); }}>
        <option value="">All countries</option>{options.countries.map((value) => <option key={value}>{value}</option>)}
      </select></label>
      <label className="grid gap-1 text-xs font-medium text-slate-600">Region<select className={field} name="region" value={region}
        onChange={(event) => setRegion(event.target.value)}><option value="">All regions</option>
        {options.regions.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
      </select></label>
      <label className="grid gap-1 text-xs font-medium text-slate-600">Agent<select className={field} name="agent" defaultValue={filters.agent}>
        <option value="">All agents</option>{options.agents.filter((agent) => !country || agent.country === country)
          .map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
      </select></label>
      <label className="grid gap-1 text-xs font-medium text-slate-600">Machine model<select className={field} name="model" defaultValue={filters.model}>
        <option value="">All models</option>{options.models.map((model) => <option key={model.id} value={model.id}>{model.code}</option>)}
      </select></label>
      <label className="grid gap-1 text-xs font-medium text-slate-600">Measure<select className={field} name="measure" defaultValue={filters.measure}>
        <option value="bookings">Bookings</option><option value="revenue">Revenue</option><option value="cash">Cash</option>
        <option value="order_book">Order book</option><option value="count">Count</option>
      </select></label>
      <label className="grid gap-1 text-xs font-medium text-slate-600">Currency<select className={field} name="currency" defaultValue={filters.currency}>
        {options.currencies.map((value) => <option key={value}>{value}</option>)}
      </select></label>
      <div className="flex items-end"><button className="w-full rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Apply filters</button></div>
    </form>
  </div>;
}
