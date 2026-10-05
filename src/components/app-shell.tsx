import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { signOut } from '@/auth';
import { setLocale } from '@/i18n/actions';

async function logout() {
  'use server';
  await signOut({ redirectTo: '/login' });
}

const sections = [
  { key: 'Home', href: '/', available: true },
  { key: 'Deals', href: '/deals', available: true },
  { key: 'Agents', href: '/partners', available: true },
  { key: 'Customers', href: '/customers', available: true },
  { key: 'Products', href: '/products', available: true },
  { key: 'Production', href: '/production', available: true },
  { key: 'Aftermarket', href: '/aftermarket', available: true },
  { key: 'Shipments', href: '/shipments', available: true },
  { key: 'Claims', href: '/claims', available: true },
  { key: 'Cases', href: '/cases', available: true },
  { key: 'Commissions', href: '/commissions', available: true },
  { key: 'Leakage', href: '/leakage', available: true },
  { key: 'Reports', href: '/reports', available: true },
  { key: 'Settings', href: '/settings', available: false },
] as const;

export async function AppShell({ children, user }: { children: React.ReactNode; user: { name: string; role: string } }) {
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="bg-brand text-white lg:min-h-screen">
        <div className="border-b border-white/15 px-6 py-7">
          <div className="text-xs uppercase tracking-[0.22em] text-slate-300">{t('International Sales')}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">{t('Kao Ming')}</div>
        </div>
        <nav aria-label="Primary" className="flex gap-1 overflow-x-auto px-3 py-3 lg:flex-col lg:overflow-visible">
          {sections.map(({ key, href, available }) => available
            && (!['Claims', 'Cases'].includes(key) || user.role !== 'logistics')
            && (key !== 'Commissions' || ['admin', 'manager', 'finance'].includes(user.role))
            && (key !== 'Leakage' || ['admin', 'manager', 'finance', 'sales'].includes(user.role))
            || key === 'Settings' && user.role === 'admin' ? (
            <Link key={key} href={href} className="whitespace-nowrap rounded-md px-4 py-2.5 text-sm text-slate-100 transition-colors hover:bg-white/15 focus:bg-white/15">
              {t(key)}
            </Link>
          ) : (
            <span key={key} aria-disabled="true" className="whitespace-nowrap rounded-md px-4 py-2.5 text-sm text-slate-400">{t(key)}</span>
          ))}
        </nav>
        <div className="hidden px-6 pb-6 pt-5 text-xs leading-relaxed text-slate-300 lg:block">
          {t('item master')} · {t('Order book')}
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 lg:px-8">
          <div className="text-sm font-medium text-slate-600">Kao Ming CRM</div>
          <div className="flex flex-wrap items-center gap-4">
          <form action={setLocale} className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600" htmlFor="locale">{t('Language')}</label>
            <select key={locale} id="locale" name="locale" defaultValue={locale} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm">
              <option value="en">English</option>
              <option value="zh-Hant">繁體中文</option>
            </select>
            <button type="submit" className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">{t('Apply')}</button>
          </form>
          <div className="hidden text-right text-xs leading-5 text-slate-500 sm:block"><strong className="block font-medium text-ink">{user.name}</strong>{t(user.role)}</div>
          <form action={logout}><button type="submit" className="text-sm font-medium text-brand hover:underline">{t('Sign out')}</button></form>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
