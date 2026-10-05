import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { exclusivities, itemTypes, partnerRelationships, partnerStatuses, regions, userRoles } from '../db/enums';
import { chineseMessages, englishMessages } from './messages';

describe('runtime translation catalog', () => {
  it('uses keys accepted by next-intl and keeps both locales in step', () => {
    expect(Object.keys(chineseMessages).every((key) => !key.includes('.'))).toBe(true);
    expect(Object.keys(englishMessages)).toEqual(Object.keys(chineseMessages));
    expect(chineseMessages['Chinese name']).toBe('中文名稱');
    expect(englishMessages.terminated).toBe('Terminated');
    expect(englishMessages.non_eu).toBe('Non EU');
  });

  it('contains every literal translation key used by the current interface', () => {
    const root = resolve(process.cwd(), 'src');
    const missing: string[] = [];
    for (const relative of readdirSync(root, { recursive: true })) {
      if (typeof relative !== 'string' || !relative.endsWith('.tsx')) continue;
      const source = readFileSync(join(root, relative), 'utf8');
      for (const [, key] of source.matchAll(/\bt\('([^']+)'\)/g)) {
        if (key && !(key in chineseMessages)) missing.push(`${relative}: ${key}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('translates every enum shown in a selector or record table', () => {
    for (const value of [...exclusivities, ...itemTypes, ...partnerRelationships, ...partnerStatuses, ...regions, ...userRoles]) {
      expect(chineseMessages[value], value).toBeTruthy();
    }
  });
});
