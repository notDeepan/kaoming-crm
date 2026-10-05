import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb } from 'pdf-lib';
import puppeteer from 'puppeteer';
import { escapeHtml } from './chinese';

export async function renderA4Pdf(html: string, footer: {
  dealNumber: string; revision: number; issueDate: string;
}): Promise<Uint8Array> {
  const chromeWindows = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const executablePath = process.env.CHROME_EXECUTABLE_PATH || (existsSync(chromeWindows) ? chromeWindows : undefined);
  const browser = await puppeteer.launch({ headless: true, executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const footerHtml = `<div style="font:8px Arial,sans-serif;color:#556070;width:100%;margin:0 12mm;border-top:1px solid #b5bec8;padding-top:4px;text-align:right">${escapeHtml(footer.dealNumber)} · revision ${escapeHtml(footer.revision)} · issued ${escapeHtml(footer.issueDate)}</div>`;
    const bytes = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true,
      displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: footerHtml });
    // Chromium outlines shaped CJK glyphs as Type 3 fonts. Add a visible left
    // footer in the bundled Noto font so the PDF carries an identifiable embed.
    const pdfDocument = await PDFDocument.load(bytes);
    pdfDocument.registerFontkit(fontkit);
    const fontBytes = await readFile(join(process.cwd(), 'public/fonts/NotoSansCJKtc-Regular.otf'));
    const noto = await pdfDocument.embedFont(fontBytes, { subset: true });
    for (const sheet of pdfDocument.getPages()) {
      sheet.drawText('高明精機', { x: 34, y: 15, font: noto, size: 7, color: rgb(0.33, 0.38, 0.44) });
    }
    return await pdfDocument.save();
  } finally { await browser.close(); }
}
