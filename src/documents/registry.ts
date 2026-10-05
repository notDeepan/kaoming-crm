import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { renderQuotationTemplate, type QuotationDocument } from './templates/quotation/template';
import { renderChineseHtml } from './chinese';
import { renderPiTemplate, type PiDocument } from './templates/pi/template';
import { renderMiTemplate, type MiDocument } from './templates/mi/template';
import { renderSpecSheetTemplate, type SpecSheetDocument } from './templates/spec-sheet/template';
import { renderProposalConfiguration, renderProposalDealPage, type TechnicalProposalDocument } from './templates/technical-proposal/template';

export async function renderQuotationHtml(data: QuotationDocument) {
  const styles = await readFile(join(process.cwd(), 'src/documents/templates/quotation/styles.css'), 'utf8');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><style>${styles}</style></head><body>${renderQuotationTemplate(data)}</body></html>`;
}

export async function renderPiHtml(data: PiDocument) {
  const styles = await readFile(join(process.cwd(), 'src/documents/templates/pi/styles.css'), 'utf8');
  return renderChineseHtml(renderPiTemplate(data), styles);
}

export async function renderMiHtml(data: MiDocument) {
  const styles = await readFile(join(process.cwd(), 'src/documents/templates/mi/styles.css'), 'utf8');
  return renderChineseHtml(renderMiTemplate(data), styles);
}

export async function renderSpecSheetHtml(data: SpecSheetDocument) {
  const styles = await readFile(join(process.cwd(), 'src/documents/templates/spec-sheet/styles.css'), 'utf8');
  return renderChineseHtml(renderSpecSheetTemplate(data), styles);
}

export async function renderTechnicalProposalHtml(data: TechnicalProposalDocument, part: 'configuration' | 'deal') {
  const styles = await readFile(join(process.cwd(), 'src/documents/templates/technical-proposal/styles.css'), 'utf8');
  return renderChineseHtml(part === 'configuration' ? renderProposalConfiguration(data) : renderProposalDealPage(data), styles);
}

export const documentTypes = {
  quotation: renderQuotationHtml, pi: renderPiHtml, mi: renderMiHtml,
  spec_sheet: renderSpecSheetHtml, technical_proposal: renderTechnicalProposalHtml,
} as const;
