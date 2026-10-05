import { describe, expect, it } from 'vitest';
import { renderProposalConfiguration, renderProposalDealPage, type TechnicalProposalDocument } from './template';

const example: TechnicalProposalDocument = {
  dealNumber: 'Q-2026-0147', revision: 4, issueDate: '2026-10-01',
  modelCode: 'KMC-637AS', modelName: 'Plano Machining Center',
  agentName: 'CP Agencies', customerName: 'FAB TOOLS', quotationNumber: 'Q-2026-0147',
  incoterm: 'FOB', paymentTerms: '30% deposit', deliveryTerms: 'FOB Taiwan',
  leadTimeText: '10–12 months', warrantyMonths: 12,
  specs: [{ name: 'Spindle', value: 'ISO 50 / 6000 rpm' }],
  excludedOptions: [{ code: 'OPT-X', name: 'Offered separately', quantity: '1' }],
};

describe('technical proposal parts', () => {
  it('prints the resolved purchased value and no option marker', () => {
    const html = renderProposalConfiguration(example);
    expect(html).toContain('ISO 50 / 6000 rpm');
    expect(html).not.toContain('*');
  });

  it('shows revision, terms and excluded options without changing the configuration page', () => {
    const html = renderProposalDealPage(example);
    expect(html).toContain('revision 4');
    expect(html).toContain('30% deposit');
    expect(html).toContain('Offered separately');
    expect(renderProposalConfiguration(example)).not.toContain('Offered separately');
  });
});
