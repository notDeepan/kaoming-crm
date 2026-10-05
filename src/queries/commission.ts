import { cents } from './money';

type ContractTerms = { commissionRate: string | null; commissionBase:
  'gross_invoice' | 'net_machine_fob' | 'after_discount' | 'before_discount' | null };

export function commissionCents(input: {
  orderValue: string; quoteListTotal: string | null; quoteIncoterm: string | null;
  machineLinesTotal: bigint | null; partnerModel: 'markup' | 'commission';
  contract: ContractTerms | null;
}): bigint | null {
  if (input.partnerModel === 'markup') return 0n;
  const rate = input.contract?.commissionRate;
  const base = input.contract?.commissionBase;
  if (!rate || !base) return null;
  let basis: bigint;
  if (base === 'gross_invoice' || base === 'after_discount') basis = cents(input.orderValue);
  else if (base === 'before_discount') {
    if (!input.quoteListTotal) return null;
    basis = cents(input.quoteListTotal);
  } else {
    if (input.quoteIncoterm !== 'FOB' || input.machineLinesTotal === null) return null;
    basis = input.machineLinesTotal;
  }
  const match = /^(\d+)(?:\.(\d{1,4}))?$/.exec(rate);
  if (!match) return null;
  const numerator = BigInt(match[1]!) * 10_000n + BigInt((match[2] ?? '').padEnd(4, '0'));
  return (basis * numerator + 5_000n) / 10_000n;
}
