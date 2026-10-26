import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, PackageCheck, PackageX, RefreshCw, Search, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// The system is used in Sri Lanka (Asia/Colombo, UTC+5:30).
const SL_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Convert a `datetime-local` value (entered as Sri Lanka local time) to a UTC ISO string
// so Postgres compares it correctly against timestamptz columns.
const slLocalToUtcIso = (local: string) => {
  const ms = Date.parse(`${local}:00`.slice(0, 19) + 'Z');
  if (isNaN(ms)) return null;
  return new Date(ms - SL_OFFSET_MS).toISOString();
};

// Format a stored UTC timestamp in Sri Lanka time (independent of the browser's timezone).
const formatSl = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + SL_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

interface DispatchReturnLog {
  id: string;
  order_id: string | null;
  order_form_number: string;
  operation_mode: string;
  vehicle_number: string;
  scanner_name: string;
  device_id: string;
  restocked: boolean;
  copy_type: string | null;
  customer_name: string | null;
  customer_district: string | null;
  table_size: string | null;
  colour: string | null;
  quantity: number;
  notes: string | null;
  created_at: string;
}

const isReturnLog = (log: DispatchReturnLog) =>
  log.operation_mode.toLowerCase().includes('return');

const DispatchReturn = () => {
  const [logs, setLogs] = useState<DispatchReturnLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fromDateTime, setFromDateTime] = useState('');
  const [toDateTime, setToDateTime] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [scannerFilter, setScannerFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('dispatch_return_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5000);

      const fromIso = fromDateTime.trim() ? slLocalToUtcIso(fromDateTime.trim()) : null;
      const toIso = toDateTime.trim() ? slLocalToUtcIso(toDateTime.trim()) : null;
      if (fromIso) query = query.gte('created_at', fromIso);
      if (toIso) query = query.lte('created_at', toIso);

      const { data, error } = await query;
      if (error) throw error;
      setLogs((data as DispatchReturnLog[]) || []);
    } catch (err) {
      console.error('Failed to fetch dispatch/return logs:', err);
      toast.error('Failed to load dispatch & return logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const vehicleOptions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.vehicle_number).filter(Boolean))).sort(),
    [logs]
  );
  const scannerOptions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.scanner_name).filter(Boolean))).sort(),
    [logs]
  );
  const districtOptions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.customer_district || '').filter(Boolean))).sort(),
    [logs]
  );

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (vehicleFilter !== 'all' && log.vehicle_number !== vehicleFilter) return false;
      if (scannerFilter !== 'all' && log.scanner_name !== scannerFilter) return false;
      if (districtFilter !== 'all' && (log.customer_district || '') !== districtFilter) return false;
      if (!q) return true;
      const haystack = [
        log.order_form_number,
        log.customer_name,
        log.customer_district,
        log.vehicle_number,
        log.scanner_name,
        log.device_id,
        log.table_size,
        log.colour,
        log.copy_type,
        log.notes,
        log.operation_mode,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [logs, search, vehicleFilter, scannerFilter, districtFilter]);

  const dispatchedLogs = useMemo(
    () => filteredLogs.filter((l) => !isReturnLog(l)),
    [filteredLogs]
  );
  const returnedLogs = useMemo(() => filteredLogs.filter(isReturnLog), [filteredLogs]);

  const clearFilters = () => {
    setSearch('');
    setFromDateTime('');
    setToDateTime('');
    setVehicleFilter('all');
    setScannerFilter('all');
    setDistrictFilter('all');
  };

  const exportToExcel = (rows: DispatchReturnLog[], sheetName: string, fileLabel: string) => {
    if (rows.length === 0) {
      toast.error('No records to export');
      return;
    }
    const data = rows.map((log) => ({
      'Date & Time (SL)': formatSl(log.created_at),
      'Order Form No': log.order_form_number,
      'Operation': log.operation_mode,
      'Customer': log.customer_name || '',
      'District': log.customer_district || '',
      'Table Size': log.table_size || '',
      'Colour': log.colour || '',
      'Quantity': log.quantity,
      'Vehicle / Driver': log.vehicle_number,
      'Scanner': log.scanner_name,
      'Device': log.device_id,
      'Copy Type': log.copy_type || '',
      'Restocked': log.restocked ? 'Yes' : 'No',
      'Notes': log.notes || '',
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 22 }, { wch: 14 },
      { wch: 12 }, { wch: 12 }, { wch: 9 }, { wch: 16 }, { wch: 14 },
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 30 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    const stamp = formatSl(new Date().toISOString()).replace(/[: ]/g, '-');
    XLSX.writeFile(workbook, `${fileLabel}-${stamp}.xlsx`);
    toast.success(`${rows.length} record(s) exported to Excel`);
  };

  const exportAll = () => {
    if (filteredLogs.length === 0) {
      toast.error('No records to export');
      return;
    }
    const workbook = XLSX.utils.book_new();
    const buildSheet = (rows: DispatchReturnLog[]) =>
      rows.map((log) => ({
        'Date & Time (SL)': formatSl(log.created_at),
        'Order Form No': log.order_form_number,
        'Operation': log.operation_mode,
        'Customer': log.customer_name || '',
        'District': log.customer_district || '',
        'Table Size': log.table_size || '',
        'Colour': log.colour || '',
        'Quantity': log.quantity,
        'Vehicle / Driver': log.vehicle_number,
        'Scanner': log.scanner_name,
        'Device': log.device_id,
        'Copy Type': log.copy_type || '',
        'Restocked': log.restocked ? 'Yes' : 'No',
        'Notes': log.notes || '',
      }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(buildSheet(dispatchedLogs)), 'Dispatched');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(buildSheet(returnedLogs)), 'Returned');
    const stamp = formatSl(new Date().toISOString()).replace(/[: ]/g, '-');
    XLSX.writeFile(workbook, `dispatch-return-${stamp}.xlsx`);
    toast.success(`${filteredLogs.length} record(s) exported to Excel`);
  };

  const renderTable = (rows: DispatchReturnLog[], variant: 'dispatch' | 'return') => (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">Date & Time (SL)</TableHead>
            <TableHead className="whitespace-nowrap">Order No</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>District</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Colour</TableHead>
            <TableHead className="text-center">Qty</TableHead>
            <TableHead className="whitespace-nowrap">Vehicle / Driver</TableHead>
            <TableHead>Scanner</TableHead>
            <TableHead>Device</TableHead>
            <TableHead className="whitespace-nowrap">Copy Type</TableHead>
            {variant === 'return' && <TableHead>Restocked</TableHead>}
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={variant === 'return' ? 13 : 12} className="text-center text-muted-foreground py-8">
                {loading ? 'Loading…' : 'No records found'}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap">{formatSl(log.created_at)}</TableCell>
                <TableCell className="font-medium whitespace-nowrap">{log.order_form_number}</TableCell>
                <TableCell>{log.customer_name || '—'}</TableCell>
                <TableCell>{log.customer_district || '—'}</TableCell>
                <TableCell className="whitespace-nowrap">{log.table_size || '—'}</TableCell>
                <TableCell>{log.colour || '—'}</TableCell>
                <TableCell className="text-center">{log.quantity}</TableCell>
                <TableCell className="whitespace-nowrap">{log.vehicle_number || '—'}</TableCell>
                <TableCell>{log.scanner_name || '—'}</TableCell>
                <TableCell>{log.device_id || '—'}</TableCell>
                <TableCell>{log.copy_type || '—'}</TableCell>
                {variant === 'return' && (
                  <TableCell>
                    <Badge variant={log.restocked ? 'default' : 'secondary'}>
                      {log.restocked ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                )}
                <TableCell className="max-w-[220px] truncate" title={log.notes || ''}>
                  {log.notes || '—'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Dispatch &amp; Return
              </CardTitle>
              <CardDescription>
                Scanned dispatch and return records. Dates and times are in Sri Lanka time.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button size="sm" onClick={exportAll} disabled={loading || filteredLogs.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export All to Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order number, customer, vehicle, scanner, size, colour, notes…"
              className="pl-9"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">From (Sri Lanka time)</label>
              <Input
                type="datetime-local"
                value={fromDateTime}
                onChange={(e) => setFromDateTime(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">To (Sri Lanka time)</label>
              <Input
                type="datetime-local"
                value={toDateTime}
                onChange={(e) => setToDateTime(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Vehicle / Driver</label>
              <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All vehicles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All vehicles</SelectItem>
                  {vehicleOptions.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Scanner</label>
              <Select value={scannerFilter} onValueChange={setScannerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All scanners" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All scanners</SelectItem>
                  {scannerOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">District</label>
              <Select value={districtFilter} onValueChange={setDistrictFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All districts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All districts</SelectItem>
                  {districtOptions.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="default" size="sm" onClick={fetchLogs} disabled={loading}>
              Apply Date Range
            </Button>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
            <span className="text-sm text-muted-foreground ml-auto">
              {filteredLogs.length} record(s) — {dispatchedLogs.length} dispatched, {returnedLogs.length} returned
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Dispatched section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <PackageCheck className="h-5 w-5 text-green-600" />
              Dispatched Orders
              <Badge variant="secondary">{dispatchedLogs.length}</Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToExcel(dispatchedLogs, 'Dispatched', 'dispatched-orders')}
              disabled={dispatchedLogs.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>{renderTable(dispatchedLogs, 'dispatch')}</CardContent>
      </Card>

      {/* Returned section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <PackageX className="h-5 w-5 text-red-600" />
              Returned Orders
              <Badge variant="secondary">{returnedLogs.length}</Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToExcel(returnedLogs, 'Returned', 'returned-orders')}
              disabled={returnedLogs.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>{renderTable(returnedLogs, 'return')}</CardContent>
      </Card>
    </div>
  );
};

export default DispatchReturn;
