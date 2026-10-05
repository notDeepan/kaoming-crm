export function previousClosedQuarter(today: string) {
  const [yearText, monthText] = today.split('-');
  const year = Number(yearText), month = Number(monthText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Invalid date');
  }
  const currentQuarter = Math.floor((month - 1) / 3);
  const previous = currentQuarter === 0 ? { year: year - 1, quarter: 4 }
    : { year, quarter: currentQuarter };
  const endMonth = previous.quarter * 3;
  const lastDay = new Date(Date.UTC(previous.year, endMonth, 0)).getUTCDate();
  const end = `${previous.year}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const start = new Date(Date.UTC(previous.year - 1, endMonth, 1)).toISOString().slice(0, 10);
  return { period: `${previous.year}-Q${previous.quarter}`, start, end };
}

export function consecutiveQuarterCount(periods: string[], ending: string) {
  const index = (period: string) => {
    const match = /^(\d{4})-Q([1-4])$/.exec(period);
    if (!match) throw new Error('Invalid quarter');
    return Number(match[1]) * 4 + Number(match[2]);
  };
  const known = new Set(periods.map(index));
  let current = index(ending), count = 0;
  while (known.has(current)) { count++; current--; }
  return count;
}
