import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer';
import { z } from 'zod';
import { loadQuotationDocument } from '@/documents/quotation-data';
import { renderQuotationHtml } from '@/documents/registry';
import { getActiveUser } from '@/lib/authorization';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getActiveUser()) return new Response('Unauthorized', { status: 401 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return new Response('Not found', { status: 404 });
  const data = await loadQuotationDocument(id);
  if (!data) return new Response('Not found', { status: 404 });
  const chromeWindows = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const executablePath = process.env.CHROME_EXECUTABLE_PATH || (existsSync(chromeWindows) ? chromeWindows : undefined);
  const browser = await puppeteer.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(await renderQuotationHtml(data), { waitUntil: 'load' });
    const footer = `<div style="font:8px Arial,sans-serif;color:#8b95a3;width:100%;margin:0 15mm;border-top:1px solid #d9dee5;padding-top:4px;text-align:right">${data.dealNumber} · revision ${data.revision} · issued ${data.issuedDate}</div>`;
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true,
      displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: footer });
    return new Response(new Uint8Array(pdf), {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${data.dealNumber}-r${data.revision}.pdf"`, 'Cache-Control': 'private, no-store' },
    });
  } finally {
    await browser.close();
  }
}
