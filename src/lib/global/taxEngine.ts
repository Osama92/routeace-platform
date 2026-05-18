/**
 * Global Tax Engine Abstraction
 * 
 * Modular tax adapters per country.
 * Nigerian PAYE logic is preserved exactly as-is.
 * Other countries plug into separate adapters.
 */

import type { TaxEngineType } from './countryConfig';

export interface TaxBreakdown {
  grossIncome: number;
  taxableIncome: number;
  incomeTax: number;
  pensionContribution: number;
  healthInsurance: number;
  otherDeductions: number;
  netIncome: number;
  effectiveRate: number;
  components: TaxComponent[];
}

export interface TaxComponent {
  name: string;
  amount: number;
  rate: number;
  description: string;
}

// ─── Nigerian PAYE (unchanged) ───────────────────────────────────

function calculateNigerianPAYE(annualGross: number): TaxBreakdown {
  const pension = annualGross * 0.08;
  const nhf = annualGross * 0.025;
  const nhis = annualGross * 0.05;
  
  const consolidatedRelief = Math.max(200000, annualGross * 0.01) + (annualGross * 0.2);
  const rentRelief = Math.min(500000, annualGross * 0.1);
  
  const totalRelief = consolidatedRelief + pension + nhf + nhis + rentRelief;
  const taxableIncome = Math.max(0, annualGross - totalRelief);
  
  // Nigerian progressive tax bands
  let tax = 0;
  let remaining = taxableIncome;
  const bands = [
    { limit: 300000, rate: 0.07 },
    { limit: 300000, rate: 0.11 },
    { limit: 500000, rate: 0.15 },
    { limit: 500000, rate: 0.19 },
    { limit: 1600000, rate: 0.21 },
    { limit: Infinity, rate: 0.24 },
  ];
  
  for (const band of bands) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, band.limit);
    tax += taxable * band.rate;
    remaining -= taxable;
  }
  
  // First ₦800k exempt
  if (annualGross <= 800000) tax = 0;
  
  const netIncome = annualGross - tax - pension - nhf - nhis;
  
  return {
    grossIncome: annualGross,
    taxableIncome,
    incomeTax: tax,
    pensionContribution: pension,
    healthInsurance: nhis,
    otherDeductions: nhf,
    netIncome,
    effectiveRate: annualGross > 0 ? (tax / annualGross) * 100 : 0,
    components: [
      { name: 'PAYE Income Tax', amount: tax, rate: 0, description: 'Progressive tax per 2024 Nigerian Tax Law' },
      { name: 'Pension (8%)', amount: pension, rate: 8, description: 'Employee pension contribution' },
      { name: 'NHF (2.5%)', amount: nhf, rate: 2.5, description: 'National Housing Fund' },
      { name: 'NHIS (5%)', amount: nhis, rate: 5, description: 'National Health Insurance Scheme' },
    ],
  };
}

// ─── UK VAT Module ───────────────────────────────────────────────

function calculateUKVAT(annualGross: number): TaxBreakdown {
  const personalAllowance = 12570;
  const taxableIncome = Math.max(0, annualGross - personalAllowance);
  
  let tax = 0;
  let remaining = taxableIncome;
  const bands = [
    { limit: 37700, rate: 0.20 },
    { limit: 99730, rate: 0.40 },
    { limit: Infinity, rate: 0.45 },
  ];
  
  for (const band of bands) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, band.limit);
    tax += taxable * band.rate;
    remaining -= taxable;
  }
  
  const ni = annualGross > 12570 ? (Math.min(annualGross, 50270) - 12570) * 0.08 + Math.max(0, annualGross - 50270) * 0.02 : 0;
  const pension = annualGross * 0.05;
  
  return {
    grossIncome: annualGross,
    taxableIncome,
    incomeTax: tax,
    pensionContribution: pension,
    healthInsurance: ni,
    otherDeductions: 0,
    netIncome: annualGross - tax - ni - pension,
    effectiveRate: annualGross > 0 ? (tax / annualGross) * 100 : 0,
    components: [
      { name: 'Income Tax', amount: tax, rate: 0, description: 'UK progressive income tax' },
      { name: 'National Insurance', amount: ni, rate: 0, description: 'Employee NI contributions' },
      { name: 'Pension (5%)', amount: pension, rate: 5, description: 'Auto-enrollment pension' },
    ],
  };
}

// ─── US State Tax Module ─────────────────────────────────────────

function calculateUSStateTax(annualGross: number): TaxBreakdown {
  const standardDeduction = 14600;
  const taxableIncome = Math.max(0, annualGross - standardDeduction);
  
  let federalTax = 0;
  let remaining = taxableIncome;
  const brackets = [
    { limit: 11600, rate: 0.10 },
    { limit: 35550, rate: 0.12 },
    { limit: 53375, rate: 0.22 },
    { limit: 82250, rate: 0.24 },
    { limit: 116150, rate: 0.32 },
    { limit: 324050, rate: 0.35 },
    { limit: Infinity, rate: 0.37 },
  ];
  
  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, bracket.limit);
    federalTax += taxable * bracket.rate;
    remaining -= taxable;
  }
  
  const fica = annualGross * 0.0765;
  const stateTax = annualGross * 0.05; // avg state estimate
  
  return {
    grossIncome: annualGross,
    taxableIncome,
    incomeTax: federalTax + stateTax,
    pensionContribution: 0,
    healthInsurance: 0,
    otherDeductions: fica,
    netIncome: annualGross - federalTax - stateTax - fica,
    effectiveRate: annualGross > 0 ? ((federalTax + stateTax) / annualGross) * 100 : 0,
    components: [
      { name: 'Federal Income Tax', amount: federalTax, rate: 0, description: 'US federal progressive tax' },
      { name: 'State Tax (est.)', amount: stateTax, rate: 5, description: 'Average state income tax' },
      { name: 'FICA (7.65%)', amount: fica, rate: 7.65, description: 'Social Security + Medicare' },
    ],
  };
}

// ─── UAE Zero-VAT Module ─────────────────────────────────────────

function calculateUAEZeroVAT(annualGross: number): TaxBreakdown {
  // No personal income tax in UAE
  return {
    grossIncome: annualGross,
    taxableIncome: 0,
    incomeTax: 0,
    pensionContribution: 0,
    healthInsurance: 0,
    otherDeductions: 0,
    netIncome: annualGross,
    effectiveRate: 0,
    components: [
      { name: 'Income Tax', amount: 0, rate: 0, description: 'No personal income tax in UAE' },
    ],
  };
}

// ─── Canada GST Module ──────────────────────────────────────────

function calculateCanadaGST(annualGross: number): TaxBreakdown {
  const personalAmount = 15705;
  const taxableIncome = Math.max(0, annualGross - personalAmount);
  
  let federalTax = 0;
  let remaining = taxableIncome;
  const brackets = [
    { limit: 55867, rate: 0.15 },
    { limit: 55866, rate: 0.205 },
    { limit: 61942, rate: 0.26 },
    { limit: 62024, rate: 0.29 },
    { limit: Infinity, rate: 0.33 },
  ];
  
  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, bracket.limit);
    federalTax += taxable * bracket.rate;
    remaining -= taxable;
  }
  
  const cpp = Math.min(annualGross * 0.0595, 3867);
  const ei = Math.min(annualGross * 0.0166, 1049);
  
  return {
    grossIncome: annualGross,
    taxableIncome,
    incomeTax: federalTax,
    pensionContribution: cpp,
    healthInsurance: 0,
    otherDeductions: ei,
    netIncome: annualGross - federalTax - cpp - ei,
    effectiveRate: annualGross > 0 ? (federalTax / annualGross) * 100 : 0,
    components: [
      { name: 'Federal Income Tax', amount: federalTax, rate: 0, description: 'Canadian federal progressive tax' },
      { name: 'CPP (5.95%)', amount: cpp, rate: 5.95, description: 'Canada Pension Plan' },
      { name: 'EI (1.66%)', amount: ei, rate: 1.66, description: 'Employment Insurance' },
    ],
  };
}

// ─── Tax Engine Registry ─────────────────────────────────────────

const TAX_ENGINES: Record<TaxEngineType, (gross: number) => TaxBreakdown> = {
  nigerian_paye: calculateNigerianPAYE,
  uk_vat: calculateUKVAT,
  us_state_tax: calculateUSStateTax,
  uae_zero_vat: calculateUAEZeroVAT,
  ca_gst: calculateCanadaGST,
};

/**
 * Calculate tax for a given country engine type.
 * Falls back to Nigerian PAYE if engine not found.
 */
export function calculateTax(engineType: TaxEngineType, annualGross: number): TaxBreakdown {
  const engine = TAX_ENGINES[engineType] || TAX_ENGINES.nigerian_paye;
  return engine(annualGross);
}

/**
 * Get display name for a tax engine type
 */
export function getTaxEngineName(engineType: TaxEngineType): string {
  const names: Record<TaxEngineType, string> = {
    nigerian_paye: 'Nigerian PAYE',
    uk_vat: 'UK Income Tax + NI',
    us_state_tax: 'US Federal + State Tax',
    uae_zero_vat: 'UAE (Tax-Free)',
    ca_gst: 'Canadian Federal Tax',
  };
  return names[engineType] || engineType;
}
