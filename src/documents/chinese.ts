import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

export function rocDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid document date');
  return `${date.getUTCFullYear() - 1911}.${String(date.getUTCMonth() + 1).padStart(2, '0')}.${String(date.getUTCDate()).padStart(2, '0')}`;
}

export async function renderChineseHtml(body: string, styles: string): Promise<string> {
  const font = await readFile(join(process.cwd(), 'public/fonts/NotoSansCJKtc-Regular.otf'));
  const fontFace = `@font-face{font-family:"Noto Sans TC";src:url(data:font/otf;base64,${font.toString('base64')}) format("opentype");font-weight:400;font-style:normal;font-display:block}`;
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"/><style>${fontFace}${styles}</style></head><body>${body}</body></html>`;
}
