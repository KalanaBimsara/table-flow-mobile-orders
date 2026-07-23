import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Truck, FileText, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DatePicker } from '@/components/DatePicker';
import { format } from 'date-fns';

type ReportKind = 'driver' | 'manager';

interface OrderRow {
  id: string;
  order_form_number: string | null;
  sales_person_name: string | null;
  customer_name: string;
  price: number | null;
  delivery_fee: number | null;
  additional_charges: number | null;
  completed_at: string | null;
  delivery_date: string | null;
  created_at: string;
}

const fmt = (n: number) =>
  n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const buildReportHtml = (kind: ReportKind, rows: OrderRow[], dateLabel: string) => {
  const isManager = kind === 'manager';
  const title = isManager ? 'ප්‍රවාහන කළමනාකරු වාර්තාව' : 'ධාවක වාර්තාව';

  const headers = isManager
    ? ['දිනය', 'ඕඩර අංකය', 'විකුණුම්කරු', 'මුදල් ලැබුණු ආකාරය', 'ලැබුණු වටිනාකම', 'ලැබීම්', 'ගෙවීම්']
    : ['දිනය', 'ඕඩර අංකය', 'විකුණුම්කරු', 'මුදල් ලැබුණු ආකාරය', 'ලැබුණු වටිනාකම'];

  let totalReceived = 0;
  let totalReceipts = 0;
  let totalPayments = 0;

  const bodyRows = rows
    .map((r) => {
      const dateSrc = r.completed_at || r.delivery_date || r.created_at;
      const d = dateSrc ? format(new Date(dateSrc), 'yyyy-MM-dd') : '';
      const received =
        Number(r.price || 0) + Number(r.delivery_fee || 0) + Number(r.additional_charges || 0);
      totalReceived += received;
      const base = `
        <td>${d}</td>
        <td>${r.order_form_number ?? ''}</td>
        <td>${r.sales_person_name ?? ''}</td>
        <td></td>
        <td class="num">${fmt(received)}</td>`;
      const managerExtra = isManager ? `<td class="num"></td><td class="num"></td>` : '';
      return `<tr>${base}${managerExtra}</tr>`;
    })
    .join('');

  const totalsRow = isManager
    ? `<tr class="totals"><td colspan="4">මුළු එකතුව</td><td class="num">${fmt(totalReceived)}</td><td class="num">${fmt(totalReceipts)}</td><td class="num">${fmt(totalPayments)}</td></tr>`
    : `<tr class="totals"><td colspan="4">මුළු එකතුව</td><td class="num">${fmt(totalReceived)}</td></tr>`;

  return `<!DOCTYPE html>
<html lang="si">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: "Iskoola Pota", "Noto Sans Sinhala", Arial, sans-serif; color:#111; margin:0; padding:0; }
  header { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid #111; padding-bottom:8px; margin-bottom:12px; }
  h1 { font-size:20px; margin:0; }
  .meta { font-size:12px; color:#333; text-align:right; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th, td { border:1px solid #333; padding:6px 8px; vertical-align:top; }
  th { background:#f0f0f0; text-align:left; }
  td.num { text-align:right; font-variant-numeric: tabular-nums; }
  tr.totals td { font-weight:bold; background:#fafafa; }
  .signatures { margin-top:32px; display:flex; justify-content:space-between; font-size:12px; }
  .sig { width:45%; }
  .sig .line { border-top:1px solid #111; margin-top:40px; padding-top:4px; text-align:center; }
  @media print { .noprint { display:none !important; } }
  .toolbar { position:fixed; top:8px; right:8px; }
  .toolbar button { padding:8px 14px; font-size:12px; cursor:pointer; }
</style>
</head>
<body>
  <div class="toolbar noprint"><button onclick="window.print()">Print</button></div>
  <header>
    <h1>${title}</h1>
    <div class="meta">
      දිනය පරාසය: ${dateLabel}<br/>
      මුද්‍රණ දිනය: ${format(new Date(), 'yyyy-MM-dd HH:mm')}
    </div>
  </header>
  <table>
    <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>
      ${bodyRows || `<tr><td colspan="${headers.length}" style="text-align:center;padding:20px;">දත්ත නොමැත</td></tr>`}
      ${rows.length ? totalsRow : ''}
    </tbody>
  </table>
  <div class="signatures">
    <div class="sig"><div class="line">${isManager ? 'ප්‍රවාහන කළමනාකරු' : 'ධාවක අත්සන'}</div></div>
    <div class="sig"><div class="line">දිනය</div></div>
  </div>
  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 400));</script>
</body>
</html>`;
};

const Transport: React.FC = () => {
  const [fromDate, setFromDate] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  });
  const [toDate, setToDate] = useState<Date | undefined>(new Date());
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('orders')
        .select('id, order_form_number, sales_person_name, customer_name, price, delivery_fee, additional_charges, completed_at, delivery_date, created_at, status')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1000);
      if (fromDate) q = q.gte('completed_at', new Date(fromDate.setHours(0, 0, 0, 0)).toISOString());
      if (toDate) q = q.lte('completed_at', new Date(toDate.setHours(23, 59, 59, 999)).toISOString());
      const { data, error } = await q;
      if (error) throw error;
      setRows((data || []) as OrderRow[]);
    } catch (e: any) {
      console.error(e);
      toast.error('දත්ත ලබා ගැනීමට අසමත් විය');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dateLabel = useMemo(() => {
    const f = fromDate ? format(fromDate, 'yyyy-MM-dd') : '—';
    const t = toDate ? format(toDate, 'yyyy-MM-dd') : '—';
    return `${f}  →  ${t}`;
  }, [fromDate, toDate]);

  const openReport = (kind: ReportKind) => {
    if (!rows.length) {
      toast.warning('තෝරාගත් දින පරාසය තුළ නිම වූ ඕඩර නොමැත');
    }
    const html = buildReportHtml(kind, rows, dateLabel);
    const w = window.open('', '_blank');
    if (!w) {
      toast.error('Pop-up blocked. Please allow pop-ups.');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const totalReceived = rows.reduce(
    (s, r) => s + Number(r.price || 0) + Number(r.delivery_fee || 0) + Number(r.additional_charges || 0),
    0,
  );

  return (
    <div className="container py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck size={20} /> Transport
          </CardTitle>
          <CardDescription>
            Download printable delivery documents for drivers and the transport manager.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div>
              <label className="text-sm font-medium block mb-1">From</label>
              <DatePicker date={fromDate} onSelect={setFromDate} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">To</label>
              <DatePicker date={toDate} onSelect={setToDate} />
            </div>
            <Button variant="outline" onClick={fetchRows} disabled={loading}>
              {loading ? 'Loading...' : 'Apply'}
            </Button>

            <div className="sm:ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Download className="mr-2 h-4 w-4" />
                    Download Delivery Documents
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem onClick={() => openReport('driver')}>
                    <FileText className="mr-2 h-4 w-4" />
                    Driver Report (ධාවක)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openReport('manager')}>
                    <FileText className="mr-2 h-4 w-4" />
                    Transport Manager Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {rows.length} completed orders in range · Total received: LKR {fmt(totalReceived)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Transport;
