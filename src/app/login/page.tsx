import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { signIn } from '@/auth';
import { setLocale } from '@/i18n/actions';
import { getActiveUser } from '@/lib/authorization';

async function login(formData: FormData) {
  'use server';
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) redirect('/login?error=credentials');
    throw error;
  }
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getActiveUser();
  if (user) redirect('/');
  const [params, t, locale] = await Promise.all([searchParams, getTranslations(), getLocale()]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-5">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Kao Ming</div>
        <h1 className="mt-2 text-3xl font-semibold text-ink">{t('Sign in')}</h1>
        <p className="mt-2 text-sm text-muted">{t('International sales workspace')}</p>
        {params.error && <p role="alert" className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-800">{t('Email or password was not accepted')}</p>}
        <form action={login} className="mt-7 space-y-5">
          <div>
            <label className="block text-sm font-medium" htmlFor="email">{t('Email')}</label>
            <input id="email" name="email" type="email" autoComplete="username" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="password">{t('Password')}</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <button type="submit" className="w-full rounded-md bg-brand px-4 py-2.5 font-medium text-white hover:bg-slate-700">{t('Sign in')}</button>
        </form>
        <form action={setLocale} className="mt-6 flex items-center justify-center gap-2 border-t border-slate-100 pt-5">
          <label htmlFor="login-locale" className="text-xs text-muted">{t('Language')}</label>
          <select key={locale} id="login-locale" name="locale" defaultValue={locale} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs">
            <option value="en">English</option>
            <option value="zh-Hant">繁體中文</option>
          </select>
          <button type="submit" className="text-xs font-medium text-brand hover:underline">{t('Apply')}</button>
        </form>
      </div>
    </main>
  );
}
