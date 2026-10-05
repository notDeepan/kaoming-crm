import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

async function main() {
  const root = process.cwd();
  const data = JSON.parse(await readFile(join(root, 'data/seed/model-specs.template.json'), 'utf8')) as
    Record<string, Record<string, { valueEn: string }>>;
  const entries = Object.entries(data['KMC-637AS'] ?? {});
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.11, 0.2, 0.28);
  page.drawText('MODEL CONTENT / PART A', { x: 52, y: 760, font: bold, size: 12, color: ink });
  page.drawText('KMC-637AS', { x: 52, y: 698, font: bold, size: 34, color: ink });
  page.drawText('Plano Machining Center', { x: 52, y: 665, font: regular, size: 16, color: ink });
  page.drawText('WORKED EXAMPLE - replace with approved model literature before external use',
    { x: 52, y: 619, font: bold, size: 9, color: rgb(0.55, 0.27, 0.18) });
  let y = 564;
  for (const [category, value] of entries) {
    page.drawText(category.replaceAll('_', ' ').toUpperCase(), { x: 52, y, font: bold, size: 10, color: ink });
    page.drawText(value.valueEn, { x: 207, y, font: regular, size: 10, color: ink });
    y -= 42;
  }
  const directory = join(root, 'public/model-proposals');
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'KMC-637AS.example.pdf'), await pdf.save());
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
