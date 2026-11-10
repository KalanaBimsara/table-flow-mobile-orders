import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Calculate additional cost for leg size
export function calculateLegSizeCost(legSize?: string): number {
  if (legSize === '2x2') {
    return 1500;
  }
  if (legSize === '3x1.5') {
    return 3000;
  }
  return 0;
}

// Calculate front panel cost
export function calculateFrontPanelCost(frontPanelSize?: string, frontPanelLength?: number): number {
  if (!frontPanelSize || !frontPanelLength) return 0;
  
  const pricePerFt: Record<string, number> = {
    '6': 250,
    '12': 500,
    '16': 750,
    '24': 1000
  };
  
  return (pricePerFt[frontPanelSize] || 0) * frontPanelLength;
}

// Calculate total additional costs for a table
export function calculateTableAdditionalCosts(legSize?: string, frontPanelSize?: string, frontPanelLength?: number): number {
  return calculateLegSizeCost(legSize) + calculateFrontPanelCost(frontPanelSize, frontPanelLength);
}

type PricedTable = {
  price?: number | string | null;
  quantity?: number | string | null;
  legSize?: string;
  frontPanelSize?: string;
  frontPanelLength?: number | string | null;
};

const toNumber = (value: unknown): number => {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : 0;
};

// Live totals for the order forms. Tolerates fields that are blank or
// mid-edit (undefined / '' / NaN) by counting them as 0.
export function calculateOrderTotals(tables?: PricedTable[] | null): {
  tablesCost: number;
  additionalTableCosts: number;
} {
  let tablesCost = 0;
  let additionalTableCosts = 0;
  for (const table of tables || []) {
    const quantity = toNumber(table.quantity);
    tablesCost += toNumber(table.price) * quantity;
    additionalTableCosts +=
      calculateTableAdditionalCosts(table.legSize, table.frontPanelSize, toNumber(table.frontPanelLength)) * quantity;
  }
  return { tablesCost, additionalTableCosts };
}
