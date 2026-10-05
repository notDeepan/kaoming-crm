'use client';

import { useTranslations } from 'next-intl';

export function ArchiveForm({ id, action }: { id: string; action: (formData: FormData) => Promise<void> }) {
  const t = useTranslations();
  return (
    <form action={action} onSubmit={(event) => { if (!window.confirm(t('Archive this record?'))) event.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">{t('Archive')}</button>
    </form>
  );
}
