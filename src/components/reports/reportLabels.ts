import { Granularity } from '@/lib/orderReports';

export const PERIOD_NAMES: Record<Granularity, { current: string; previous: string; unit: string }> = {
  day: { current: 'Today', previous: 'Yesterday', unit: 'Day' },
  week: { current: 'This week', previous: 'Last week', unit: 'Week' },
  month: { current: 'This month', previous: 'Last month', unit: 'Month' },
  year: { current: 'This year', previous: 'Last year', unit: 'Year' },
};

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  awaiting_approval: 'Awaiting approval',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const fmt1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString();

export const formatRs = (n: number) => `Rs ${Math.round(n).toLocaleString('en-US')}`;

/** "Rs 7.4M" / "Rs 412K" for tight spaces. */
export const formatRsShort = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `Rs ${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 10_000) return `Rs ${Math.round(n / 1000)}K`;
  return formatRs(n);
};

export const statusLabel = (s: string) => STATUS_LABELS[s] ?? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Units per size, largest first, from size-and-colour rows. */
export const collapseBySize = (rows: { size: string; units: number }[]) => {
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.size, (map.get(r.size) ?? 0) + r.units);
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
};
