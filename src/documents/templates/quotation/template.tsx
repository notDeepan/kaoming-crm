export type QuotationDocument = {
  dealNumber: string; revision: number; issuedDate: string; validUntil: string | null;
  partnerName: string; customerName: string | null; modelName: string | null; modelCode: string | null;
  currency: string; priceBookName: string; paymentTerms: string | null; deliveryTerms: string | null;
  leadTimeText: string | null; incoterm: string; warrantyMonths: number;
  listTotal: string; discountAmount: string; netTotal: string; draft: boolean;
  lines: { lineNo: number; itemCode: string; itemType: string; descriptionEn: string;
    quantity: string; unitPrice: string; lineDiscount: string; lineTotal: string; included: boolean }[];
  standardAccessories: string[];
};

function esc(value: string | number | null | undefined) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

function money(value: string, currency: string) {
  return esc(currency) + ' ' + Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderLine(line: QuotationDocument['lines'][number], currency: string) {
  return '<tr><td>' + esc(line.lineNo) + '</td><td><strong>' + esc(line.descriptionEn) + '</strong><small>'
    + esc(line.itemCode) + (line.included ? '' : ' · Quoted, not included') + '</small></td><td class="right">'
    + esc(line.quantity) + '</td><td class="right">' + money(line.unitPrice, currency)
    + '</td><td class="right">' + money(line.lineDiscount, currency)
    + '</td><td class="right">' + (line.included ? money(line.lineTotal, currency) : 'Not included') + '</td></tr>';
}

function renderTable(lines: QuotationDocument['lines'], currency: string) {
  return '<table><thead><tr><th>#</th><th>Description</th><th class="right">Qty</th><th class="right">Unit price</th><th class="right">Discount</th><th class="right">Line total</th></tr></thead><tbody>'
    + lines.map((line) => renderLine(line, currency)).join('') + '</tbody></table>';
}

export function renderQuotationTemplate(data: QuotationDocument) {
  const configuration = data.lines.filter((line) => line.itemType === 'machine' || line.itemType === 'spec_change');
  const options = data.lines.filter((line) => !['machine', 'spec_change'].includes(line.itemType));
  const discounted = Number(data.discountAmount) > 0;
  return [
    '<div class="document">', data.draft ? '<div class="watermark">DRAFT</div>' : '',
    '<header class="document-header"><div><div class="company-mark">KMC</div><div class="company-name">KAO MING MACHINERY INDUSTRIAL CO., LTD.</div><div class="company-subtitle">International Sales</div></div>',
    '<div class="document-title"><span>QUOTATION</span><strong>', esc(data.dealNumber), ' / r', esc(data.revision), '</strong><small>Issued ', esc(data.issuedDate), '</small></div></header>',
    '<div class="accent-rule"></div><section class="recipient-grid">',
    '<div><span class="caption">TO / AGENT</span><strong>', esc(data.partnerName), '</strong>',
    data.customerName ? '<span>End customer: ' + esc(data.customerName) + '</span>' : '', '</div>',
    '<div><span class="caption">REFERENCE</span><strong>', esc(data.dealNumber), '</strong><span>Valid until ', esc(data.validUntil ?? 'On issue'), '</span></div>',
    '<div><span class="caption">MACHINE</span><strong>', esc(data.modelCode ?? 'Pending model'), '</strong><span>', esc(data.modelName), '</span></div></section>',
    '<section class="section"><div class="section-heading"><h2>Machine &amp; configuration</h2><span>Price book ', esc(data.priceBookName), '</span></div>',
    renderTable(configuration, data.currency), '</section>',
    '<section class="section"><div class="section-heading"><h2>Optional accessories &amp; services</h2><span>Offered options shown separately</span></div>',
    renderTable(options, data.currency), options.length ? '' : '<p class="empty-note">No optional accessories on this revision.</p>', '</section>',
    '<div class="totals"><div>',
    discounted ? '<p class="list-total">List total <s>' + money(data.listTotal, data.currency) + '</s></p>' : '',
    discounted ? '<p>Line discounts <span>− ' + money(data.discountAmount, data.currency) + '</span></p>' : '',
    '<p class="net-total">Total price <strong>', money(data.netTotal, data.currency), '</strong></p></div></div>',
    '<section class="section accessories"><h2>Standard accessories</h2>',
    data.standardAccessories.length ? '<ul>' + data.standardAccessories.map((name) => '<li>' + esc(name) + '</li>').join('') + '</ul>' : '<p class="empty-note">No standard accessories are recorded for this model.</p>',
    '</section><section class="section terms"><h2>Commercial terms &amp; remarks</h2><dl>',
    '<div><dt>Payment</dt><dd>', esc(data.paymentTerms ?? 'To be agreed'), '</dd></div>',
    '<div><dt>Delivery</dt><dd>', esc(data.deliveryTerms ?? 'To be agreed'), ' · ', esc(data.incoterm), '</dd></div>',
    '<div><dt>Lead time</dt><dd>', esc(data.leadTimeText ?? 'To be agreed'), '</dd></div>',
    '<div><dt>Warranty</dt><dd>', esc(data.warrantyMonths), ' months</dd></div></dl></section>',
    '</div>',
  ].join('');
}
