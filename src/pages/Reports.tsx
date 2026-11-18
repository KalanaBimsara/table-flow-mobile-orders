import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarRange, Download, Factory, Loader2, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  chartTheme, DonutChart, PeriodBarChart, RankedBarChart, SeriesDef, toDonutSlices, useIsDark,
} from '@/components/reports/ReportCharts';
import {
  analyseWindow, Backlog, buildBacklog, buildPeriods, buildPeriodStats, buildReportModel, DAY_MS, daysBetween,
  formatHour, formatSlDate, formatSlDateTime, fromSlInputValue, Granularity, OrderFacts, PeriodStats, periodStartOf,
  presetWindow, ReportWindow, Slice, sumTotals, suggestGranularity, toSlInputValue,
} from '@/lib/orderReports';
import { fetchReportData, ReportRawData } from '@/lib/reportData';
import { exportReportPdf } from '@/components/reports/exportReportPdf';
import {
  collapseBySize, fmt1, formatRs, formatRsShort, PERIOD_NAMES, statusLabel,
} from '@/components/reports/reportLabels';

const RANGE_OPTIONS: Record<Granularity, { value: string; label: string }[]> = {
  day: [
    { value: '7', label: 'Last 7 days' },
    { value: '14', label: 'Last 14 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '60', label: 'Last 60 days' },
    { value: '90', label: 'Last 90 days' },
  ],
  week: [
    { value: '4', label: 'Last 4 weeks' },
    { value: '8', label: 'Last 8 weeks' },
    { value: '12', label: 'Last 12 weeks' },
    { value: '26', label: 'Last 26 weeks' },
    { value: '52', label: 'Last 52 weeks' },
  ],
  month: [
    { value: '3', label: 'Last 3 months' },
    { value: '6', label: 'Last 6 months' },
    { value: '12', label: 'Last 12 months' },
    { value: '24', label: 'Last 24 months' },
  ],
  year: [{ value: 'all', label: 'All years' }],
};

const DEFAULT_RANGE: Record<Granularity, string> = { day: '30', week: '12', month: '12', year: 'all' };

const GROUP_LABEL: Record<Granularity, string> = { day: 'Daily', week: 'Weekly', month: 'Monthly', year: 'Yearly' };

/** Quick custom ranges, all on 5 PM business-day boundaries. */
const QUICK_RANGES: { label: string; window: (now: number) => ReportWindow }[] = [
  { label: 'Today', window: (now) => ({ startMs: periodStartOf(now, 'day'), endMs: now + 1 }) },
  {
    label: 'Yesterday',
    window: (now) => { const s = periodStartOf(now, 'day'); return { startMs: s - DAY_MS, endMs: s }; },
  },
  { label: 'Last 3 days', window: (now) => ({ startMs: periodStartOf(now, 'day') - 2 * DAY_MS, endMs: now + 1 }) },
  { label: 'This week', window: (now) => ({ startMs: periodStartOf(now, 'week'), endMs: now + 1 }) },
  {
    label: 'Last week',
    window: (now) => { const s = periodStartOf(now, 'week'); return { startMs: s - 7 * DAY_MS, endMs: s }; },
  },
  { label: 'This month', window: (now) => ({ startMs: periodStartOf(now, 'month'), endMs: now + 1 }) },
  {
    label: 'Last month',
    window: (now) => { const s = periodStartOf(now, 'month'); return { startMs: periodStartOf(s - 1, 'month'), endMs: s }; },
  },
];

const Swatch = ({ color }: { color: string }) => (
  <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} aria-hidden />
);

const Kpi = ({ label, value, sub, emphasis }: { label: string; value: string; sub?: string; emphasis?: boolean }) => (
  <Card className={emphasis ? 'border-primary/40' : undefined}>
    <CardContent className="p-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </CardContent>
  </Card>
);

const SectionTitle = ({ title, sub }: { title: string; sub?: string }) => (
  <div>
    <h2 className="text-lg font-semibold">{title}</h2>
    {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
  </div>
);

const SUMMARY_ROWS = [
  { key: 'ordersEntered', label: 'Orders entered', colorIndex: 0 },
  { key: 'unitsEntered', label: 'Units entered', colorIndex: 0 },
  { key: 'unitsDispatched', label: 'Units dispatched', colorIndex: 1 },
  { key: 'ordersCompleted', label: 'Orders completed', colorIndex: 2 },
] as const;

const SummaryCard = ({
  g, current, previous, colors,
}: { g: Granularity; current: PeriodStats; previous?: PeriodStats; colors: string[] }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-base">{PERIOD_NAMES[g].current}</CardTitle>
      <CardDescription className="text-xs">{current.range}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-1.5">
      {SUMMARY_ROWS.map((r) => (
        <div key={r.key} className="flex items-baseline justify-between gap-2">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Swatch color={colors[r.colorIndex]} />
            {r.label}
          </span>
          <span className="whitespace-nowrap text-right">
            <span className="text-lg font-semibold tabular-nums">{current[r.key]}</span>
            {previous && (
              <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">
                {PERIOD_NAMES[g].previous.toLowerCase()} {previous[r.key]}
              </span>
            )}
          </span>
        </div>
      ))}
    </CardContent>
  </Card>
);

const StatusBadge = ({ status }: { status: string }) => (
  <Badge
    variant={status === 'completed' ? 'secondary' : status === 'pending' ? 'outline' : 'default'}
    className="whitespace-nowrap font-normal"
  >
    {statusLabel(status)}
  </Badge>
);

const Empty = ({ text = 'No data in this range.' }: { text?: string }) => (
  <p className="py-8 text-center text-sm text-muted-foreground">{text}</p>
);

const ORDERS_PREVIEW = 25;

const Reports: React.FC = () => {
  const [raw, setRaw] = useState<ReportRawData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loadedAt, setLoadedAt] = useState<number>(Date.now());
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [range, setRange] = useState<Record<Granularity, string>>(DEFAULT_RANGE);
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [custom, setCustom] = useState<ReportWindow | null>(null);
  const [backlogScope, setBacklogScope] = useState<'range' | 'all'>('range');
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [showAllBacklog, setShowAllBacklog] = useState(false);
  const theme = chartTheme(useIsDark());

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      setRaw(await fetchReportData());
      setLoadedAt(Date.now());
    } catch (e) {
      console.error('Error loading report data:', e);
      setError(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Could not load report data');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const model = useMemo(() => (raw ? buildReportModel(raw.orders, raw.items, raw.scans) : null), [raw]);

  const summary = useMemo(() => {
    if (!model) return null;
    return (['day', 'week', 'month', 'year'] as Granularity[]).map((g) => {
      const [previous, current] = buildPeriodStats(model, g, 2, loadedAt);
      return { g, current, previous };
    });
  }, [model, loadedAt]);

  const win: ReportWindow | null = useMemo(() => {
    if (!model) return null;
    if (mode === 'custom' && custom) return custom;
    const r = range[granularity];
    return presetWindow(model, granularity, r === 'all' ? null : Number(r), loadedAt);
  }, [model, mode, custom, range, granularity, loadedAt]);

  const periods = useMemo(
    () => (model && win ? buildPeriods(model, granularity, win, loadedAt) : []),
    [model, win, granularity, loadedAt],
  );
  const totals = useMemo(() => sumTotals(periods), [periods]);
  const analysis = useMemo(() => (model && win ? analyseWindow(model, win) : null), [model, win]);
  const backlogAll = useMemo(() => (model ? buildBacklog(model.orders) : null), [model]);
  const backlog: Backlog | null = backlogScope === 'all' ? backlogAll : analysis?.backlog ?? null;

  const windowLabel = win
    ? `${formatSlDateTime(win.startMs)} – ${win.endMs > loadedAt ? 'now' : formatSlDateTime(win.endMs)}`
    : '';
  const rangeTitle = mode === 'custom' && custom
    ? 'Custom range'
    : RANGE_OPTIONS[granularity].find((o) => o.value === range[granularity])?.label ?? '';

  const applyCustom = (w?: ReportWindow) => {
    const next = w ?? { startMs: fromSlInputValue(fromInput) ?? NaN, endMs: fromSlInputValue(toInput) ?? NaN };
    if (!Number.isFinite(next.startMs) || !Number.isFinite(next.endMs)) {
      toast.error('Choose both a start and an end date and time');
      return;
    }
    if (next.endMs <= next.startMs) {
      toast.error('The end must be after the start');
      return;
    }
    if (w) {
      setFromInput(toSlInputValue(w.startMs));
      setToInput(toSlInputValue(Math.min(w.endMs, loadedAt)));
    }
    setCustom(next);
    setGranularity(suggestGranularity(next));
    setMode('custom');
    setShowAllOrders(false);
  };

  const openCustom = () => {
    if (!fromInput || !toInput) {
      const w = win ?? { startMs: periodStartOf(loadedAt, 'day'), endMs: loadedAt };
      setFromInput(toSlInputValue(w.startMs));
      setToInput(toSlInputValue(Math.min(w.endMs, loadedAt)));
    }
    setMode('custom');
  };

  const clearCustom = () => {
    setMode('preset');
    setCustom(null);
    setShowAllOrders(false);
  };

  const orderSeries: SeriesDef[] = [
    { key: 'ordersEntered', label: 'Orders entered', color: theme.series[0] },
    { key: 'ordersDispatched', label: 'Orders dispatched', color: theme.series[1] },
    { key: 'ordersCompleted', label: 'Orders completed', color: theme.series[2] },
  ];
  const unitSeries: SeriesDef[] = [
    { key: 'unitsEntered', label: 'Units entered', color: theme.series[0] },
    { key: 'unitsDispatched', label: 'Units dispatched', color: theme.series[1] },
  ];

  const handleExport = async () => {
    if (!model || !analysis || !backlogAll || !win) return;
    setExporting(true);
    try {
      await exportReportPdf({
        granularity,
        rangeTitle,
        windowLabel,
        generatedAt: loadedAt,
        periods,
        totals,
        analysis,
        backlogAll,
        summary: summary ?? [],
      });
    } catch (e) {
      console.error('PDF export failed:', e);
      toast.error('Could not create the PDF');
    } finally {
      setExporting(false);
    }
  };

  const unit = PERIOD_NAMES[granularity].unit;
  const loading = !model || !analysis;
  const a = analysis;

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <BarChart3 className="h-6 w-6" />
            Order Reports
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A day runs from 5:00 PM to 5:00 PM (Sri Lanka time). Orders after 5:00 PM count for the next day.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleExport} disabled={loading || exporting}>
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download PDF
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {/* Current periods */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary
          ? summary.map(({ g, current, previous }) => (
              <SummaryCard key={g} g={g} current={current} previous={previous} colors={theme.series} />
            ))
          : Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
      </div>

      {/* Range */}
      <Card className="border-primary/30">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-md border p-0.5">
              <Button size="sm" variant={mode === 'preset' ? 'default' : 'ghost'} className="h-8" onClick={clearCustom}>
                Recent periods
              </Button>
              <Button size="sm" variant={mode === 'custom' ? 'default' : 'ghost'} className="h-8" onClick={openCustom}>
                <CalendarRange className="mr-1.5 h-4 w-4" />
                Date range
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Group by</span>
              <Tabs value={granularity} onValueChange={(v) => { setGranularity(v as Granularity); setShowAllOrders(false); }}>
                <TabsList>
                  {(['day', 'week', 'month', 'year'] as Granularity[]).map((g) => (
                    <TabsTrigger key={g} value={g}>{GROUP_LABEL[g]}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              {mode === 'preset' && RANGE_OPTIONS[granularity].length > 1 && (
                <Select value={range[granularity]} onValueChange={(v) => setRange((prev) => ({ ...prev, [granularity]: v }))}>
                  <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RANGE_OPTIONS[granularity].map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {mode === 'custom' && (
            <div className="space-y-3 rounded-md bg-muted/40 p-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <div className="space-y-1">
                  <Label htmlFor="report-from" className="text-xs">From (Sri Lanka time)</Label>
                  <Input id="report-from" type="datetime-local" value={fromInput} onChange={(e) => setFromInput(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="report-to" className="text-xs">To (Sri Lanka time)</Label>
                  <Input id="report-to" type="datetime-local" value={toInput} onChange={(e) => setToInput(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => applyCustom()}>Apply</Button>
                  {custom && (
                    <Button variant="ghost" size="icon" onClick={clearCustom} aria-label="Clear date range">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_RANGES.map((q) => (
                  <Button key={q.label} variant="outline" size="sm" className="h-7 text-xs" onClick={() => applyCustom(q.window(loadedAt))}>
                    {q.label}
                  </Button>
                ))}
              </div>
              {!custom && <p className="text-xs text-muted-foreground">Pick a start and end, then Apply. Times are 24-hour, Sri Lanka time.</p>}
            </div>
          )}

          <div className="text-sm">
            <span className="font-medium">Showing:</span>{' '}
            <span className="text-muted-foreground">{rangeTitle}{windowLabel && ` · ${windowLabel}`}</span>
          </div>
        </CardContent>
      </Card>

      {/* Activity in range */}
      <div className="space-y-3">
        <SectionTitle title="Activity in this range" sub="What happened between the start and end of the range." />
        {loading || !a ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi label="Orders entered" value={a.orders.length.toLocaleString()} sub={`${a.units.toLocaleString()} units · ${a.itemLines} item lines`} emphasis />
            <Kpi label="Order value" value={formatRsShort(a.value)} sub={`average ${formatRs(a.avgOrderValue)}`} emphasis />
            <Kpi label="Units dispatched" value={a.unitsDispatched.toLocaleString()} sub={`${a.ordersDispatched} orders first dispatched`} emphasis />
            <Kpi label="Orders completed" value={a.ordersCompleted.toLocaleString()} sub={a.unitsReturned ? `${a.unitsReturned} units returned` : 'No returns'} emphasis />
            <Kpi label="Units per order" value={fmt1(a.avgUnitsPerOrder)} sub={`${fmt1(a.avgItemsPerOrder)} item lines per order`} />
            <Kpi label="Delivery fees" value={formatRsShort(a.deliveryFees)} sub={`extra charges ${formatRs(a.additionalCharges)}`} />
            <Kpi
              label="Entry to dispatch"
              value={a.medianDaysToDispatch === null ? '—' : `${fmt1(a.medianDaysToDispatch)} days`}
              sub={a.avgDaysToDispatch === null ? 'no dispatches' : `median · average ${fmt1(a.avgDaysToDispatch)} days`}
            />
            <Kpi label="Gate pass scans" value={a.dispatchScans.toLocaleString()} sub={`${a.vehicles.length} vehicles used`} />
          </div>
        )}
      </div>

      {/* Standing of orders entered in range */}
      <div className="space-y-3">
        <SectionTitle
          title="Orders entered in this range: where they stand now"
          sub="Status and dispatch progress today for the orders that were entered in the range."
        />
        {loading || !a ? (
          <Skeleton className="h-40 w-full" />
        ) : a.orders.length === 0 ? (
          <Card><CardContent><Empty text="No orders were entered in this range." /></CardContent></Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Kpi label="Still to manufacture" value={`${a.remainingUnits} units`} sub={`in ${a.ordersToMake} orders`} emphasis />
              <Kpi label="Units dispatched so far" value={a.dispatchedUnitsOfThese.toLocaleString()} sub={`of ${a.units} units ordered`} />
              <Kpi label="Fully dispatched" value={a.fullyDispatched.toLocaleString()} sub={`${a.partlyDispatched} partly dispatched`} />
              <Kpi label="Not dispatched yet" value={a.notDispatched.toLocaleString()} sub={`of ${a.orders.length} orders`} />
            </div>
            <Card>
              <CardContent className="p-4">
                <div className="mb-2 text-sm font-medium">Current status</div>
                <div className="flex flex-wrap gap-2">
                  {a.byStatus.map((s) => (
                    <div key={s.name} className="rounded-lg border px-3 py-2">
                      <div className="text-xs text-muted-foreground">{statusLabel(s.name)}</div>
                      <div className="text-lg font-semibold tabular-nums">
                        {s.count} <span className="text-xs font-normal text-muted-foreground">orders · {s.units} units</span>
                      </div>
                    </div>
                  ))}
                </div>
                <DispatchProgressBar a={a} colors={theme} />
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Orders chart */}
      <Card>
        <CardHeader>
          <CardTitle>Orders by {unit.toLowerCase()}</CardTitle>
          <CardDescription>Entered by order date, dispatched by first gate pass scan, completed by completion date.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-[300px] w-full" /> : <PeriodBarChart data={periods} series={orderSeries} theme={theme} />}
        </CardContent>
      </Card>

      {/* Units chart */}
      <Card>
        <CardHeader>
          <CardTitle>Units entered and dispatched by {unit.toLowerCase()}</CardTitle>
          <CardDescription>Units are table quantities: an order of 3 tables counts 3 units.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-[300px] w-full" /> : <PeriodBarChart data={periods} series={unitSeries} theme={theme} />}
        </CardContent>
      </Card>

      {/* Period table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{unit} by {unit.toLowerCase()}</CardTitle>
          <CardDescription>
            Newest first. {mode === 'custom' ? 'The first and last rows only count what falls inside the range.' : `The current ${unit.toLowerCase()} is still in progress.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{unit}</TableHead>
                  <TableHead className="px-2 text-right">Orders in</TableHead>
                  <TableHead className="px-2 text-right">Units in</TableHead>
                  <TableHead className="hidden px-2 text-right lg:table-cell">Value</TableHead>
                  <TableHead className="hidden px-2 text-right sm:table-cell">Orders out</TableHead>
                  <TableHead className="px-2 text-right">Units out</TableHead>
                  <TableHead className="px-2 text-right">Done</TableHead>
                  <TableHead className="hidden px-2 text-right md:table-cell">Returned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...periods].reverse().map((p) => (
                  <TableRow key={p.key}>
                    <TableCell className="font-medium md:whitespace-nowrap">
                      <div>
                        {p.label}
                        {p.isCurrent && <span className="ml-2 text-xs font-normal text-muted-foreground">so far</span>}
                        {p.isPartial && <span className="ml-2 text-xs font-normal text-muted-foreground">part</span>}
                      </div>
                      <div className="hidden text-xs font-normal text-muted-foreground lg:block">{p.range}</div>
                    </TableCell>
                    <TableCell className="px-2 text-right tabular-nums">{p.ordersEntered}</TableCell>
                    <TableCell className="px-2 text-right tabular-nums">{p.unitsEntered}</TableCell>
                    <TableCell className="hidden px-2 text-right tabular-nums lg:table-cell">{formatRs(p.valueEntered)}</TableCell>
                    <TableCell className="hidden px-2 text-right tabular-nums sm:table-cell">{p.ordersDispatched}</TableCell>
                    <TableCell className="px-2 text-right tabular-nums">{p.unitsDispatched}</TableCell>
                    <TableCell className="px-2 text-right tabular-nums">{p.ordersCompleted}</TableCell>
                    <TableCell className="hidden px-2 text-right tabular-nums md:table-cell">{p.unitsReturned}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="px-2 text-right font-semibold tabular-nums">{totals.ordersEntered}</TableCell>
                  <TableCell className="px-2 text-right font-semibold tabular-nums">{totals.unitsEntered}</TableCell>
                  <TableCell className="hidden px-2 text-right font-semibold tabular-nums lg:table-cell">{formatRs(totals.valueEntered)}</TableCell>
                  <TableCell className="hidden px-2 text-right font-semibold tabular-nums sm:table-cell">{totals.ordersDispatched}</TableCell>
                  <TableCell className="px-2 text-right font-semibold tabular-nums">{totals.unitsDispatched}</TableCell>
                  <TableCell className="px-2 text-right font-semibold tabular-nums">{totals.ordersCompleted}</TableCell>
                  <TableCell className="hidden px-2 text-right font-semibold tabular-nums md:table-cell">{totals.unitsReturned}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
          <p className="px-4 pb-4 text-xs text-muted-foreground sm:px-0 sm:pb-0 sm:pt-3">
            In = entered as orders. Out = dispatched from the factory (gate pass scans). Done = orders marked completed.
          </p>
        </CardContent>
      </Card>

      {/* Sales people */}
      <Card>
        <CardHeader>
          <CardTitle>Sales people</CardTitle>
          <CardDescription>
            Orders entered in the range by each sales person (each user account enters as one sales person), and where
            those orders stand now.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!a ? <Skeleton className="h-[240px] w-full" /> : a.salesPeople.length === 0 ? <Empty /> : (
            <div className="grid items-start gap-6 lg:grid-cols-[240px_1fr]">
              <DonutChart
                slices={toDonutSlices(a.salesPeople, theme)}
                theme={theme}
                centerValue={a.orders.length.toLocaleString()}
                centerLabel="orders"
              />
              <SliceTable rows={a.salesPeople} colors={theme.series} otherColor={theme.other} total={a.orders.length} nameLabel="Sales person" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* To manufacture */}
      <Card>
        <CardHeader className="gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Factory className="h-5 w-5" /> To manufacture</CardTitle>
            <CardDescription>
              Orders not completed or cancelled with fewer units dispatched than ordered.
            </CardDescription>
          </div>
          <Tabs value={backlogScope} onValueChange={(v) => { setBacklogScope(v as 'range' | 'all'); setShowAllBacklog(false); }}>
            <TabsList>
              <TabsTrigger value="range">Orders from this range</TabsTrigger>
              <TabsTrigger value="all">All open orders</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="space-y-6">
          {!backlog ? <Skeleton className="h-[200px] w-full" /> : backlog.orders.length === 0 ? (
            <Empty text="Nothing waiting to be made." />
          ) : (
            <>
              <p className="text-sm">
                <span className="text-2xl font-semibold tabular-nums">{backlog.units}</span>{' '}
                <span className="text-muted-foreground">units still to make in {backlog.orders.length} orders</span>
              </p>
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-medium">By size and top colour</h3>
                  <div className="max-h-[360px] overflow-y-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Size</TableHead>
                          <TableHead>Top colour</TableHead>
                          <TableHead className="text-right">Units</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {backlog.bySizeColour.map((r) => (
                          <TableRow key={`${r.size}|${r.colour}`}>
                            <TableCell className="font-medium">{r.size}</TableCell>
                            <TableCell>{r.colour}</TableCell>
                            <TableCell className="text-right tabular-nums">{r.units}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={2} className="font-semibold">Total</TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">{backlog.units}</TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium">By size</h3>
                  <RankedBarChart
                    data={collapseBySize(backlog.bySizeColour).slice(0, 12)}
                    color={theme.series[1]}
                    theme={theme}
                    unit="Units to make"
                    labelWidth={80}
                  />
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium">Orders waiting ({backlog.orders.length}, oldest first)</h3>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead className="hidden sm:table-cell">Entered</TableHead>
                        <TableHead className="hidden md:table-cell">Sales person</TableHead>
                        <TableHead className="hidden md:table-cell">Status</TableHead>
                        <TableHead className="px-2 text-right">Units</TableHead>
                        <TableHead className="px-2 text-right">Sent</TableHead>
                        <TableHead className="px-2 text-right">To make</TableHead>
                        <TableHead className="px-2 text-right">Waiting</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(showAllBacklog ? backlog.orders : backlog.orders.slice(0, ORDERS_PREVIEW)).map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-medium">
                            {o.formNumber}
                            <div className="text-xs font-normal text-muted-foreground">{o.customer}</div>
                          </TableCell>
                          <TableCell className="hidden whitespace-nowrap sm:table-cell">{formatSlDate(o.createdAt)}</TableCell>
                          <TableCell className="hidden md:table-cell">{o.salesPerson}</TableCell>
                          <TableCell className="hidden md:table-cell"><StatusBadge status={o.status} /></TableCell>
                          <TableCell className="px-2 text-right tabular-nums">{o.units}</TableCell>
                          <TableCell className="px-2 text-right tabular-nums">{o.dispatchedUnits}</TableCell>
                          <TableCell className="px-2 text-right font-semibold tabular-nums">{o.remainingUnits}</TableCell>
                          <TableCell className="whitespace-nowrap px-2 text-right tabular-nums">{fmt1(daysBetween(o.createdAt, loadedAt) ?? 0)} d</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {backlog.orders.length > ORDERS_PREVIEW && (
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowAllBacklog((v) => !v)}>
                    {showAllBacklog ? 'Show fewer' : `Show all ${backlog.orders.length} orders`}
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dispatch and delivery */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dispatch by vehicle</CardTitle>
            <CardDescription>Units dispatched in the range, from the vehicle recorded on each gate pass scan.</CardDescription>
          </CardHeader>
          <CardContent>
            {!a ? <Skeleton className="h-[200px]" /> : a.vehicles.length === 0 ? <Empty text="Nothing dispatched in this range." /> : (
              <>
                <RankedBarChart data={a.vehicles.map((v) => ({ name: v.name, value: v.units }))} color={theme.series[1]} theme={theme} unit="Units" labelWidth={150} />
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {a.vehicles.map((v) => <div key={v.name}>{v.name}: {v.units} units in {v.count} orders</div>)}
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delivery type</CardTitle>
            <CardDescription>Orders entered in the range, courier or not.</CardDescription>
          </CardHeader>
          <CardContent>
            {!a ? <Skeleton className="h-[200px]" /> : a.deliveryTypes.length === 0 ? <Empty /> : (
              <SliceTable rows={a.deliveryTypes} colors={theme.series} otherColor={theme.other} total={a.orders.length} nameLabel="Type" compact />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Products and districts */}
      <div className="grid gap-6 md:grid-cols-2">
        <RankedCard title="Table sizes" sub="Units ordered in the range." data={a?.sizes.slice(0, 12).map((s) => ({ name: s.name, value: s.units }))} color={theme.series[0]} theme={theme} unit="Units" labelWidth={70} />
        <RankedCard title="Top colours" sub="Units ordered by top colour." data={a?.colours.slice(0, 12).map((s) => ({ name: s.name, value: s.units }))} color={theme.series[0]} theme={theme} unit="Units" labelWidth={90} />
        <RankedCard title="Leg colours" sub="Units ordered by leg colour." data={a?.legColours.slice(0, 12).map((s) => ({ name: s.name, value: s.units }))} color={theme.series[0]} theme={theme} unit="Units" labelWidth={90} />
        <RankedCard title="Districts" sub="Orders entered by customer district." data={a?.districts.slice(0, 12).map((s) => ({ name: s.name, value: s.orders }))} color={theme.series[0]} theme={theme} unit="Orders" labelWidth={100} />
      </div>

      {/* Timing */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orders by hour of day</CardTitle>
            <CardDescription>When orders in the range were entered (Sri Lanka time).</CardDescription>
          </CardHeader>
          <CardContent>
            {!a ? <Skeleton className="h-[220px]" /> : (
              <PeriodBarChart
                data={a.byHour.map((h) => ({ shortLabel: formatHour(h.hour), label: `${formatHour(h.hour)} – ${formatHour((h.hour + 1) % 24)}`, range: '', isCurrent: false, orders: h.orders, units: h.units }))}
                series={[{ key: 'orders', label: 'Orders', color: theme.series[0] }]}
                theme={theme}
                height={220}
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orders by day of week</CardTitle>
            <CardDescription>Using the 5 PM business day each order counts for.</CardDescription>
          </CardHeader>
          <CardContent>
            {!a ? <Skeleton className="h-[220px]" /> : (
              <PeriodBarChart
                data={a.byWeekday.map((d) => ({ shortLabel: d.day, label: d.day, range: '', isCurrent: false, orders: d.orders, units: d.units }))}
                series={[
                  { key: 'orders', label: 'Orders', color: theme.series[0] },
                  { key: 'units', label: 'Units', color: theme.series[3] },
                ]}
                theme={theme}
                height={220}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Orders in range */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Orders entered in this range</CardTitle>
          <CardDescription>
            {a ? `${a.orders.length} orders, newest first, with their items, units, value and dispatch progress.` : ' '}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {!a ? <Skeleton className="m-4 h-[200px]" /> : a.orders.length === 0 ? <Empty /> : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead className="hidden md:table-cell">Entered</TableHead>
                      <TableHead className="hidden lg:table-cell">Sales person</TableHead>
                      <TableHead className="hidden lg:table-cell">Details</TableHead>
                      <TableHead className="px-2 text-right">Items</TableHead>
                      <TableHead className="px-2 text-right">Units</TableHead>
                      <TableHead className="px-2 text-right">Sent</TableHead>
                      <TableHead className="hidden px-2 text-right xl:table-cell">Value</TableHead>
                      <TableHead className="hidden sm:table-cell">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(showAllOrders ? a.orders : a.orders.slice(0, ORDERS_PREVIEW)).map((o) => <OrderRow key={o.id} o={o} />)}
                  </TableBody>
                </Table>
              </div>
              {a.orders.length > ORDERS_PREVIEW && (
                <Button variant="ghost" size="sm" className="m-2 sm:m-0 sm:mt-2" onClick={() => setShowAllOrders((v) => !v)}>
                  {showAllOrders ? 'Show fewer' : `Show all ${a.orders.length} orders`}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Dispatched figures come from gate pass scans on the Dispatch &amp; Return page. When the same item is scanned
        more than once within 10 minutes it is counted once. Order value is the order total including delivery fee and
        extra charges.
        {model && model.unmatchedScans > 0 && ` ${model.unmatchedScans} scans could not be matched to an order and are left out.`}
        {` Loaded ${formatSlDateTime(loadedAt)}.`}
      </p>
    </div>
  );
};

/** Orders from the range split into fully, partly and not dispatched. */
const DispatchProgressBar = ({ a, colors }: { a: NonNullable<ReturnType<typeof analyseWindow>>; colors: ReturnType<typeof chartTheme> }) => {
  const total = a.orders.length || 1;
  const parts = [
    { label: 'Fully dispatched', value: a.fullyDispatched, color: colors.series[2] },
    { label: 'Partly dispatched', value: a.partlyDispatched, color: colors.series[3] },
    { label: 'Not dispatched', value: a.notDispatched, color: colors.series[1] },
  ];
  return (
    <div className="mt-4">
      <div className="mb-1.5 text-sm font-medium">Dispatch progress</div>
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
        {parts.filter((p) => p.value > 0).map((p) => (
          <div key={p.label} style={{ width: `${(p.value / total) * 100}%`, backgroundColor: p.color }} title={`${p.label}: ${p.value}`} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {parts.map((p) => (
          <span key={p.label} className="flex items-center gap-1.5">
            <Swatch color={p.color} /> {p.label} <span className="font-medium text-foreground tabular-nums">{p.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

const RankedCard = ({
  title, sub, data, color, theme, unit, labelWidth,
}: {
  title: string;
  sub: string;
  data?: { name: string; value: number }[];
  color: string;
  theme: ReturnType<typeof chartTheme>;
  unit: string;
  labelWidth: number;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
      <CardDescription>{sub}</CardDescription>
    </CardHeader>
    <CardContent>
      {!data ? <Skeleton className="h-[240px]" /> : data.length === 0 ? <Empty /> : (
        <RankedBarChart data={data} color={color} theme={theme} unit={unit} labelWidth={labelWidth} />
      )}
    </CardContent>
  </Card>
);

const OrderRow = ({ o }: { o: OrderFacts }) => (
  <TableRow>
    <TableCell className="font-medium">
      {o.formNumber}
      <div className="text-xs font-normal text-muted-foreground">{o.customer}</div>
    </TableCell>
    <TableCell className="hidden whitespace-nowrap md:table-cell">{formatSlDateTime(o.createdAt)}</TableCell>
    <TableCell className="hidden lg:table-cell">{o.salesPerson}</TableCell>
    <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
      {o.itemLines.map((l, i) => <div key={i}>{l.units} × {l.size} {l.colour}</div>)}
    </TableCell>
    <TableCell className="px-2 text-right tabular-nums">{o.items}</TableCell>
    <TableCell className="px-2 text-right tabular-nums">{o.units}</TableCell>
    <TableCell className="px-2 text-right tabular-nums">{o.dispatchedUnits}</TableCell>
    <TableCell className="hidden whitespace-nowrap px-2 text-right tabular-nums xl:table-cell">{formatRs(o.value)}</TableCell>
    <TableCell className="hidden sm:table-cell"><StatusBadge status={o.status} /></TableCell>
  </TableRow>
);

const SliceTable = ({
  rows, colors, otherColor, total, nameLabel, compact,
}: { rows: Slice[]; colors: string[]; otherColor: string; total: number; nameLabel: string; compact?: boolean }) => (
  <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{nameLabel}</TableHead>
          <TableHead className="px-2 text-right">Orders</TableHead>
          <TableHead className="hidden px-2 text-right sm:table-cell">Share</TableHead>
          <TableHead className="px-2 text-right">Units</TableHead>
          <TableHead className="hidden px-2 text-right md:table-cell">Value</TableHead>
          <TableHead className="px-2 text-right">Sent</TableHead>
          <TableHead className="px-2 text-right">To make</TableHead>
          {!compact && <TableHead className="hidden px-2 text-right md:table-cell">Pending</TableHead>}
          {!compact && <TableHead className="hidden px-2 text-right md:table-cell">Completed</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={r.name}>
            <TableCell>
              <span className="flex items-center gap-2 font-medium">
                {!compact && <Swatch color={i < 7 ? colors[i] : otherColor} />}
                {r.name}
              </span>
            </TableCell>
            <TableCell className="px-2 text-right tabular-nums">{r.orders}</TableCell>
            <TableCell className="hidden px-2 text-right tabular-nums text-muted-foreground sm:table-cell">
              {total ? Math.round((r.orders / total) * 100) : 0}%
            </TableCell>
            <TableCell className="px-2 text-right tabular-nums">{r.units}</TableCell>
            <TableCell className="hidden whitespace-nowrap px-2 text-right tabular-nums md:table-cell">{formatRs(r.value)}</TableCell>
            <TableCell className="px-2 text-right tabular-nums">{r.dispatchedUnits}</TableCell>
            <TableCell className="px-2 text-right tabular-nums">{r.remainingUnits}</TableCell>
            {!compact && <TableCell className="hidden px-2 text-right tabular-nums md:table-cell">{r.pendingOrders}</TableCell>}
            {!compact && <TableCell className="hidden px-2 text-right tabular-nums md:table-cell">{r.completedOrders}</TableCell>}
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell className="font-semibold">Total</TableCell>
          <TableCell className="px-2 text-right font-semibold tabular-nums">{rows.reduce((s, r) => s + r.orders, 0)}</TableCell>
          <TableCell className="hidden sm:table-cell" />
          <TableCell className="px-2 text-right font-semibold tabular-nums">{rows.reduce((s, r) => s + r.units, 0)}</TableCell>
          <TableCell className="hidden whitespace-nowrap px-2 text-right font-semibold tabular-nums md:table-cell">{formatRs(rows.reduce((s, r) => s + r.value, 0))}</TableCell>
          <TableCell className="px-2 text-right font-semibold tabular-nums">{rows.reduce((s, r) => s + r.dispatchedUnits, 0)}</TableCell>
          <TableCell className="px-2 text-right font-semibold tabular-nums">{rows.reduce((s, r) => s + r.remainingUnits, 0)}</TableCell>
          {!compact && <TableCell className="hidden px-2 text-right font-semibold tabular-nums md:table-cell">{rows.reduce((s, r) => s + r.pendingOrders, 0)}</TableCell>}
          {!compact && <TableCell className="hidden px-2 text-right font-semibold tabular-nums md:table-cell">{rows.reduce((s, r) => s + r.completedOrders, 0)}</TableCell>}
        </TableRow>
      </TableFooter>
    </Table>
  </div>
);

export default Reports;
