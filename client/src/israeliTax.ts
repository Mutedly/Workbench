// Israeli payroll tax engine for an employee (שכיר), based on 2026 figures.
// All amounts are MONTHLY shekels. This is an estimate, not official payroll advice.
//
// Sources (2026):
//  - Income tax brackets (יגיעה אישית) — kol-zchut / Tax Authority
//  - Credit point value (נקודת זיכוי): 242 ₪/month
//  - National Insurance (ביטוח לאומי) employee: 1.04% up to 7,703, 7% above (ceiling 51,910)
//  - Health insurance (מס בריאות) employee: 3.23% up to 7,703, 5.17% above (ceiling 51,910)

export const CREDIT_POINT_VALUE = 242; // ₪ per point per month (2026)

// Monthly income-tax brackets for personal-exertion income (2026, after "ריווח").
export const INCOME_TAX_BRACKETS: { upTo: number; rate: number }[] = [
  { upTo: 7010, rate: 0.1 },
  { upTo: 10060, rate: 0.14 },
  { upTo: 19000, rate: 0.2 },
  { upTo: 25100, rate: 0.31 },
  { upTo: 46690, rate: 0.35 },
  { upTo: 60130, rate: 0.47 },
  { upTo: Infinity, rate: 0.5 }, // 47% + 3% surtax (מס יסף)
];

// National Insurance + Health insurance (employee share), 2026.
const NI_REDUCED_CEILING = 7703; // 60% of average wage
const NI_TOP_CEILING = 51910; // max income charged
const NI_RATE_LOW = 0.0104;
const NI_RATE_HIGH = 0.07;
const HEALTH_RATE_LOW = 0.0323;
const HEALTH_RATE_HIGH = 0.0517;

export interface IsraeliBreakdown {
  gross: number;
  incomeTaxBeforeCredits: number;
  creditValue: number;
  incomeTax: number;
  nationalInsurance: number;
  healthInsurance: number;
  totalDeductions: number;
  net: number;
}

function bracketTax(monthlyGross: number): number {
  let tax = 0;
  let prev = 0;
  for (const b of INCOME_TAX_BRACKETS) {
    if (monthlyGross <= prev) break;
    const slice = Math.min(monthlyGross, b.upTo) - prev;
    tax += slice * b.rate;
    prev = b.upTo;
  }
  return tax;
}

function twoTierRate(monthlyGross: number, lowRate: number, highRate: number): number {
  const charged = Math.min(monthlyGross, NI_TOP_CEILING);
  const low = Math.min(charged, NI_REDUCED_CEILING) * lowRate;
  const high = Math.max(0, charged - NI_REDUCED_CEILING) * highRate;
  return low + high;
}

export function computeIsraeliTax(monthlyGross: number, creditPoints: number): IsraeliBreakdown {
  const gross = Math.max(0, monthlyGross);
  const incomeTaxBeforeCredits = bracketTax(gross);
  const creditValue = Math.max(0, creditPoints) * CREDIT_POINT_VALUE;
  const incomeTax = Math.max(0, incomeTaxBeforeCredits - creditValue);
  const nationalInsurance = twoTierRate(gross, NI_RATE_LOW, NI_RATE_HIGH);
  const healthInsurance = twoTierRate(gross, HEALTH_RATE_LOW, HEALTH_RATE_HIGH);
  const totalDeductions = incomeTax + nationalInsurance + healthInsurance;
  return {
    gross,
    incomeTaxBeforeCredits,
    creditValue,
    incomeTax,
    nationalInsurance,
    healthInsurance,
    totalDeductions,
    net: gross - totalDeductions,
  };
}
