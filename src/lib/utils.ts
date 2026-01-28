import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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

// Re-export calculateLegSizeCost from order.ts for backward compatibility
export { calculateLegSizeCost } from '@/types/order';

// Calculate total additional costs for a table
export function calculateTableAdditionalCosts(legSize?: string, frontPanelSize?: string, frontPanelLength?: number): number {
  // Import dynamically to avoid circular dependency issues
  const legCost = legSize === '2x2' ? 1500 : legSize === '3x1.5' ? 3000 : 0;
  return legCost + calculateFrontPanelCost(frontPanelSize, frontPanelLength);
}
