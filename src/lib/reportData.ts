import { supabase } from '@/integrations/supabase/client';
import { ReportItemRow, ReportOrderRow, ReportScanRow } from '@/lib/orderReports';

const PAGE_SIZE = 1000;

/** Reads every page of a query so totals are never cut off at the 1000-row limit. */
async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

export type ReportRawData = {
  orders: ReportOrderRow[];
  items: ReportItemRow[];
  scans: ReportScanRow[];
};

export const fetchReportData = async (): Promise<ReportRawData> => {
  const [orders, items, scans] = await Promise.all([
    fetchAllPages<ReportOrderRow>((from, to) =>
      supabase
        .from('orders')
        .select('id, order_form_number, customer_name, customer_district, sales_person_name, status, delivery_type, price, delivery_fee, additional_charges, created_at, completed_at')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)),
    fetchAllPages<ReportItemRow>((from, to) =>
      supabase
        .from('order_tables')
        .select('order_id, size, colour, top_colour, frame_colour, quantity')
        .order('id', { ascending: true })
        .range(from, to)),
    // Gate pass scans are the factory's dispatch (and return) record.
    fetchAllPages<ReportScanRow>((from, to) =>
      supabase
        .from('dispatch_return_logs')
        .select('order_id, order_form_number, operation_mode, vehicle_number, table_size, colour, quantity, created_at')
        .ilike('copy_type', 'gate pass')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)),
  ]);
  return { orders, items, scans };
};
