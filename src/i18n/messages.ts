import source from '../../data/i18n/zh-Hant.json';

// The supplied reference catalog includes sentence keys with periods. next-intl
// reserves periods for namespace paths, so retain only valid flat keys at runtime.
export const chineseMessages = Object.fromEntries(
  Object.entries(source).filter(([key]) => !key.includes('.')),
);

function englishLabel(key: string): string {
  if (!/^[a-z][a-z0-9_]*$/.test(key)) return key;
  return key.split('_').map((part, index) => {
    if (part === 'eu') return 'EU';
    return index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part;
  }).join(' ');
}

export const englishMessages = Object.fromEntries(
  Object.keys(chineseMessages).map((key) => [key, englishLabel(key)]),
);
