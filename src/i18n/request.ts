import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { chineseMessages, englishMessages } from './messages';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const stored = cookieStore.get('km-locale')?.value;
  const locale = stored === 'en' || stored === 'zh-Hant'
    ? stored
    : process.env.DEFAULT_LOCALE === 'zh-Hant' ? 'zh-Hant' : 'en';

  return {
    locale,
    messages: locale === 'zh-Hant' ? chineseMessages : englishMessages,
  };
});
