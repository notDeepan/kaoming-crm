import Link from 'next/link';

export function PageHeader({ eyebrow, title, description, action }: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-5 border-b border-slate-200 pb-6">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.17em] text-accent">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>}
      </div>
      {action && <Link href={action.href} className="rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">{action.label}</Link>}
    </div>
  );
}
