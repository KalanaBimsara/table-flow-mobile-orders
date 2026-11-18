import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { BarChart3, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart';
import { buildPeriodStats, Granularity, OrderEventRow, PeriodStats } from '@/lib/orderReports';

const chartConfig = {
  entered: { label: 'Entered', theme: { light: '#2a78d6', dark: '#3987e5' } },
  delivered: { label: 'Delivered (assigned)', theme: { light: '#eb6834', dark: '#d95926' } },
  completed: { label: 'Completed', theme: { light: '#1baf7a', dark: '#199e70' } },
} satisfies ChartConfig;

const METRICS = ['entered', 'delivered', 'completed'] as const;

const SHORT_LABELS: Record<typeof METRICS[number], string> = {
  entered: 'Entered',
  delivered: 'Delivered',
  completed: 'Completed',
};

const RANGE_OPTIONS: Record<Granularity, { value: string; label: string }[]> = {
  day: [
    { value: '14', label: 'Last 14 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '60', label: 'Last 60 days' },
    { value: '90', label: 'Last 90 days' },
  ],
  week: [
    { value: '8', label: 'Last 8 weeks' },
    { value: '12', label: 'Last 12 weeks' },
    { value: '26', label: 'Last 26 weeks' },
    { value: '52', label: 'Last 52 weeks' },
  ],
  month: [
    { value: '6', label: 'Last 6 months' },
    { value: '12', label: 'Last 12 months' },
    { value: '24', label: 'Last 24 months' },
  ],
  year: [{ value: 'all', label: 'All years' }],
};

const DEFAULT_RANGE: Record<Granularity, string> = { day: '30', week: '12', month: '12', year: 'all' };

const PERIOD_NAMES: Record<Granularity, { current: string; previous: string; unit: string }> = {
  day: { current: 'Today', previous: 'Yesterday', unit: 'Day' },
  week: { current: 'This week', previous: 'Last week', unit: 'Week' },
  month: { current: 'This month', previous: 'Last month', unit: 'Month' },
  year: { current: 'This year', previous: 'Last year', unit: 'Year' },
};

const PAGE_SIZE = 1000;

const fetchOrderEvents = async (): Promise<OrderEventRow[]> => {
  const rows: OrderEventRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('orders')
      .select('created_at, assigned_at, completed_at')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
};

const Swatch = ({ metric }: { metric: typeof METRICS[number] }) => (
  <span
    className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
    style={{ backgroundColor: `var(--color-${metric})` }}
    aria-hidden
  />
);

const SummaryCard = ({ g, current, previous }: { g: Granularity; current: PeriodStats; previous?: PeriodStats }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-base">{PERIOD_NAMES[g].current}</CardTitle>
      <CardDescription className="text-xs">{current.range}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-2">
      {METRICS.map((m) => (
        <div key={m} className="flex items-baseline justify-between gap-2">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Swatch metric={m} />
            {chartConfig[m].label}
          </span>
          <span className="text-right">
            <span className="text-xl font-semibold tabular-nums">{current[m]}</span>
            {previous && (
              <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                {PERIOD_NAMES[g].previous.toLowerCase()} {previous[m]}
              </span>
            )}
          </span>
        </div>
      ))}
    </CardContent>
  </Card>
);

const Reports: React.FC = () => {
  const [rows, setRows] = useState<OrderEventRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [range, setRange] = useState<Record<Granularity, string>>(DEFAULT_RANGE);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      setRows(await fetchOrderEvents());
      setLoadedAt(new Date());
    } catch (e) {
      console.error('Error loading report data:', e);
      setError(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Could not load orders');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Current and previous period for each granularity, for the summary cards.
  const summary = useMemo(() => {
    if (!rows) return null;
    const now = loadedAt?.getTime() ?? Date.now();
    return (['day', 'week', 'month', 'year'] as Granularity[]).map((g) => {
      const [previous, current] = buildPeriodStats(rows, g, 2, now);
      return { g, current, previous };
    });
  }, [rows, loadedAt]);

  const periods = useMemo(() => {
    if (!rows) return [];
    const r = range[granularity];
    return buildPeriodStats(rows, granularity, r === 'all' ? null : Number(r), loadedAt?.getTime());
  }, [rows, granularity, range, loadedAt]);

  const totals = useMemo(
    () => periods.reduce(
      (acc, p) => ({ entered: acc.entered + p.entered, delivered: acc.delivered + p.delivered, completed: acc.completed + p.completed }),
      { entered: 0, delivered: 0, completed: 0 },
    ),
    [periods],
  );

  const rangeLabel = RANGE_OPTIONS[granularity].find((o) => o.value === range[granularity])?.label;

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-6">
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
        <Button variant="outline" size="sm" onClick={load} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary
          ? summary.map(({ g, current, previous }) => (
              <SummaryCardWithColours key={g} g={g} current={current} previous={previous} />
            ))
          : Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
      </div>

      <Card>
        <CardHeader className="gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Orders by {PERIOD_NAMES[granularity].unit.toLowerCase()}</CardTitle>
            <CardDescription>{rangeLabel}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
              <TabsList>
                <TabsTrigger value="day">Daily</TabsTrigger>
                <TabsTrigger value="week">Weekly</TabsTrigger>
                <TabsTrigger value="month">Monthly</TabsTrigger>
                <TabsTrigger value="year">Yearly</TabsTrigger>
              </TabsList>
            </Tabs>
            {RANGE_OPTIONS[granularity].length > 1 && (
              <Select
                value={range[granularity]}
                onValueChange={(v) => setRange((prev) => ({ ...prev, [granularity]: v }))}
              >
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RANGE_OPTIONS[granularity].map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!rows ? (
            <Skeleton className="h-[320px] w-full" />
          ) : (
            <ChartContainer config={chartConfig} className="aspect-auto h-[320px] w-full">
              <BarChart data={periods} barGap={2} margin={{ left: -16, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="shortLabel"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={16}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
                <ChartTooltip
                  cursor={{ fillOpacity: 0.5 }}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => {
                        const p = payload?.[0]?.payload as PeriodStats | undefined;
                        if (!p) return null;
                        return (
                          <div>
                            <div>{p.label}{p.isCurrent ? ' (so far)' : ''}</div>
                            <div className="font-normal text-muted-foreground">{p.range}</div>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                {METRICS.map((m) => (
                  <Bar key={m} dataKey={m} fill={`var(--color-${m})`} radius={[4, 4, 0, 0]} maxBarSize={28} />
                ))}
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{PERIOD_NAMES[granularity].unit} by {PERIOD_NAMES[granularity].unit.toLowerCase()}</CardTitle>
          <CardDescription>
            Newest first. The current {PERIOD_NAMES[granularity].unit.toLowerCase()} is still in progress.
            Delivered means set to assigned.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6 sm:pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{PERIOD_NAMES[granularity].unit}</TableHead>
                <TableHead className="hidden md:table-cell">From – to</TableHead>
                {METRICS.map((m) => (
                  <TableHead key={m} className="px-2 text-right sm:px-4">{SHORT_LABELS[m]}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...periods].reverse().map((p) => (
                <TableRow key={p.key}>
                  <TableCell className="font-medium sm:whitespace-nowrap">
                    {p.label}
                    {p.isCurrent && <span className="ml-2 text-xs font-normal text-muted-foreground">so far</span>}
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">{p.range}</TableCell>
                  {METRICS.map((m) => (
                    <TableCell key={m} className="px-2 text-right tabular-nums sm:px-4">{p[m]}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="hidden md:table-cell" />
                {METRICS.map((m) => (
                  <TableCell key={m} className="px-2 text-right font-semibold tabular-nums sm:px-4">{totals[m]}</TableCell>
                ))}
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Entered counts orders by when they were created. Delivered counts orders by when they were set to assigned,
        and completed by when they were marked completed. Assignment times are recorded from 18 Nov 2026: for orders
        assigned before then the time is estimated from their last update, and orders already completed by then have
        no assignment time.
        {loadedAt && ` Loaded ${loadedAt.toLocaleTimeString()}.`}
      </p>
    </div>
  );
};

// The summary cards sit outside a chart, so they get the series colour
// variables from a wrapper that defines them for both themes.
const SummaryCardWithColours = (props: React.ComponentProps<typeof SummaryCard>) => (
  <div className="[--color-entered:#2a78d6] [--color-delivered:#eb6834] [--color-completed:#1baf7a] dark:[--color-entered:#3987e5] dark:[--color-delivered:#d95926] dark:[--color-completed:#199e70]">
    <SummaryCard {...props} />
  </div>
);

export default Reports;
