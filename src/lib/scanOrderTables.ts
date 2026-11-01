import { supabase } from '@/integrations/supabase/client';
import { fetchOrderTablesByOrderIds } from '@/lib/fetchOrderTables';

export interface OrderTableRow {
  id: string;
  order_id: string | null;
  size: string;
  colour: string;
  top_colour: string | null;
  frame_colour: string | null;
  quantity: number;
}

interface ScanLike {
  id: string;
  order_id: string | null;
  order_form_number: string;
}

const CHUNK_SIZE = 100;

/**
 * Fetches the real table details (from `order_tables`) for a list of scan records.
 * Scans without an `order_id` are resolved through `orders.order_form_number` first.
 * Returns a map of scan id -> order_tables rows (empty array when none found).
 */
export async function fetchTablesForScans<T extends ScanLike>(scans: T[]): Promise<Map<string, OrderTableRow[]>> {
  const result = new Map<string, OrderTableRow[]>();
  if (scans.length === 0) return result;

  // Resolve order ids for scans that only carry the printed order form number.
  const resolvedIdByScanId = new Map<string, string>();
  const missing = scans.filter(s => !s.order_id && s.order_form_number);
  const formNumbers = [...new Set(missing.map(s => s.order_form_number))];
  for (let i = 0; i < formNumbers.length; i += CHUNK_SIZE) {
    const chunk = formNumbers.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_form_number')
      .in('order_form_number', chunk);
    if (error) throw error;
    const idByFormNumber = new Map((data || []).map(o => [o.order_form_number, o.id]));
    for (const scan of missing) {
      const id = idByFormNumber.get(scan.order_form_number);
      if (id) resolvedIdByScanId.set(scan.id, id);
    }
  }

  const orderIdForScan = (scan: T) => scan.order_id || resolvedIdByScanId.get(scan.id) || null;
  const allOrderIds = [...new Set(scans.map(orderIdForScan).filter(Boolean) as string[])];
  if (allOrderIds.length === 0) return result;

  const { data, error } = await fetchOrderTablesByOrderIds(allOrderIds);
  if (error) throw error;

  const rowsByOrderId = new Map<string, OrderTableRow[]>();
  for (const row of (data as OrderTableRow[]) || []) {
    if (!row.order_id) continue;
    const list = rowsByOrderId.get(row.order_id) || [];
    list.push(row);
    rowsByOrderId.set(row.order_id, list);
  }

  for (const scan of scans) {
    const orderId = orderIdForScan(scan);
    result.set(scan.id, (orderId && rowsByOrderId.get(orderId)) || []);
  }
  return result;
}

/** One line per order_tables row: "24x48 ×2\n24x60". */
export const formatTableSizes = (rows: OrderTableRow[]) =>
  rows.map(r => (r.quantity > 1 ? `${r.size} ×${r.quantity}` : r.size)).join('\n');

/** One line per order_tables row: "White / Black" (top / frame colours). */
export const formatTableColours = (rows: OrderTableRow[]) =>
  rows
    .map(r => {
      const top = r.top_colour || r.colour || '';
      const frame = r.frame_colour || '';
      return frame && frame !== top ? `${top} / ${frame}` : top;
    })
    .filter(Boolean)
    .join('\n');

export const totalTableQuantity = (rows: OrderTableRow[]) =>
  rows.reduce((sum, r) => sum + (r.quantity || 0), 0);

/**
 * Units per size, one line each: "30x72 — 2\nL-A — 1".
 * Duplicate sizes across rows are summed into a single line.
 */
export const formatUnitsBySize = (rows: OrderTableRow[]) => {
  const unitsBySize = new Map<string, number>();
  for (const r of rows) {
    const size = (r.size || '').trim() || '—';
    unitsBySize.set(size, (unitsBySize.get(size) || 0) + (r.quantity || 0));
  }
  return [...unitsBySize.entries()].map(([size, qty]) => `${size} — ${qty}`).join('\n');
};

