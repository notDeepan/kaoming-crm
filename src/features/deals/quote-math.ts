import { minorUnitsToDecimal, parseDecimalToMinorUnits } from '@/lib/money';

export type CalculatedLine = {
  quantity: string; unitPrice: string; lineDiscount: string;
  lineTotal: string; listAmount: string; isIncludedInTotal: boolean;
};

export function calculateLine(quantity: string, unitPrice: string, lineDiscount: string, included: boolean): CalculatedLine {
  const quantityHundredths = parseDecimalToMinorUnits(quantity);
  const priceMinor = parseDecimalToMinorUnits(unitPrice);
  const discountMinor = parseDecimalToMinorUnits(lineDiscount);
  if (quantityHundredths <= 0n || priceMinor <= 0n) throw new Error('Quantity and unit price must be positive');
  const gross = (quantityHundredths * priceMinor + 50n) / 100n;
  if (discountMinor < 0n || discountMinor > gross) throw new Error('Line discount must be between zero and the line list amount');
  // Re-parse to enforce numeric(14,2) limits even after multiplication.
  const listAmount = minorUnitsToDecimal(gross);
  parseDecimalToMinorUnits(listAmount);
  const lineTotal = included ? gross - discountMinor : 0n;
  return {
    quantity: minorUnitsToDecimal(quantityHundredths), unitPrice: minorUnitsToDecimal(priceMinor),
    lineDiscount: minorUnitsToDecimal(discountMinor), lineTotal: minorUnitsToDecimal(lineTotal),
    listAmount, isIncludedInTotal: included,
  };
}

export function calculateTotals(lines: { quantity: string; unitPrice: string; lineDiscount: string; isIncludedInTotal: boolean }[]) {
  let list = 0n;
  let discount = 0n;
  for (const line of lines) {
    if (!line.isIncludedInTotal) continue;
    const calculated = calculateLine(line.quantity, line.unitPrice, line.lineDiscount, true);
    list += parseDecimalToMinorUnits(calculated.listAmount);
    discount += parseDecimalToMinorUnits(calculated.lineDiscount);
  }
  return {
    listTotal: minorUnitsToDecimal(list),
    discountAmount: minorUnitsToDecimal(discount),
    netTotal: minorUnitsToDecimal(list - discount),
  };
}
