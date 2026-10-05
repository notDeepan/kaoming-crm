import { describe, expect, it } from 'vitest';
import { commissionCents } from './commission';

const basis = { orderValue: '100000.00', quoteListTotal: '120000.00',
  quoteIncoterm: 'FOB', machineLinesTotal: 8_000_000n } as const;

describe('B1 commission-adjusted shipped revenue', () => {
  it('uses zero commission for markup partners', () => {
    expect(commissionCents({ ...basis, partnerModel: 'markup', contract: null })).toBe(0n);
  });
  it('uses the contract base at order time', () => {
    expect(commissionCents({ ...basis, partnerModel: 'commission',
      contract: { commissionRate: '0.1000', commissionBase: 'after_discount' } })).toBe(1_000_000n);
    expect(commissionCents({ ...basis, partnerModel: 'commission',
      contract: { commissionRate: '0.1000', commissionBase: 'before_discount' } })).toBe(1_200_000n);
    expect(commissionCents({ ...basis, partnerModel: 'commission',
      contract: { commissionRate: '0.0750', commissionBase: 'net_machine_fob' } })).toBe(600_000n);
  });
  it('excludes orders whose commission basis cannot be computed', () => {
    expect(commissionCents({ ...basis, partnerModel: 'commission', contract: null })).toBeNull();
    expect(commissionCents({ ...basis, quoteIncoterm: 'CIF', partnerModel: 'commission',
      contract: { commissionRate: '0.0750', commissionBase: 'net_machine_fob' } })).toBeNull();
  });
});
