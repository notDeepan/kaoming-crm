'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function setLocale(formData: FormData) {
  const requested = formData.get('locale');
  if (requested !== 'en' && requested !== 'zh-Hant') {
    throw new Error('Unsupported locale');
  }

  (await cookies()).set('km-locale', requested, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.AUTH_URL
      ? new URL(process.env.AUTH_URL).protocol === 'https:'
      : process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath('/');
}
