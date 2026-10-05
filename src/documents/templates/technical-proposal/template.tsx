import { escapeHtml as e } from '../../chinese';

export type ProposalSpec = { name: string; value: string };
export type ProposalOption = { code: string; name: string; quantity: string };
export type TechnicalProposalDocument = {
  dealNumber: string; revision: number; issueDate: string;
  modelCode: string; modelName: string; agentName: string; customerName: string;
  quotationNumber: string; incoterm: string; paymentTerms: string;
  deliveryTerms: string; leadTimeText: string; warrantyMonths: number;
  specs: ProposalSpec[]; excludedOptions: ProposalOption[];
};

export function renderProposalConfiguration(data: TechnicalProposalDocument): string {
  return `<main><div class="eyebrow">PART B · CONFIRMED CONFIGURATION</div>
    <h1>${e(data.modelCode)} · ${e(data.modelName)}</h1>
    <p class="intro">Configuration offered with quotation ${e(data.quotationNumber)}, revision ${e(data.revision)}.</p>
    <table><thead><tr><th>Specification</th><th>Confirmed value</th></tr></thead><tbody>
    ${data.specs.map((spec) => `<tr><td>${e(spec.name)}</td><td>${e(spec.value)}</td></tr>`).join('')}
    </tbody></table></main>`;
}

export function renderProposalDealPage(data: TechnicalProposalDocument): string {
  return `<main><div class="eyebrow">PART C · DEAL RECORD</div><h1>Technical proposal</h1>
    <div class="grid"><div><span>Quotation</span><strong>${e(data.quotationNumber)} · revision ${e(data.revision)}</strong></div>
    <div><span>Agent</span><strong>${e(data.agentName)}</strong></div>
    <div><span>End customer</span><strong>${e(data.customerName)}</strong></div>
    <div><span>Machine</span><strong>${e(data.modelCode)} · ${e(data.modelName)}</strong></div>
    <div><span>Incoterm</span><strong>${e(data.incoterm)}</strong></div>
    <div><span>Warranty</span><strong>${e(data.warrantyMonths)} months</strong></div></div>
    <h2>Commercial terms</h2>
    <p><strong>Payment:</strong> ${e(data.paymentTerms || 'To be confirmed')}</p>
    <p><strong>Delivery:</strong> ${e(data.deliveryTerms || 'To be confirmed')}</p>
    <p><strong>Lead time:</strong> ${e(data.leadTimeText || 'To be confirmed')}</p>
    <h2>Options quoted separately and excluded from the total</h2>
    ${data.excludedOptions.length ? `<table><thead><tr><th>Code</th><th>Description</th><th>Quantity</th></tr></thead><tbody>
      ${data.excludedOptions.map((option) => `<tr><td>${e(option.code)}</td><td>${e(option.name)}</td><td>${e(option.quantity)}</td></tr>`).join('')}
      </tbody></table>` : '<p>None.</p>'}</main>`;
}
