import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  chartTheme, DonutChart, PeriodBarChart, RankedBarChart, toDonutSlices,
} from '@/components/reports/ReportCharts';
import {
  collapseBySize, fmt1, formatRs, formatRsShort, PERIOD_NAMES, statusLabel,
} from '@/components/reports/reportLabels';
import {
  Backlog, daysBetween, formatHour, formatSlDate, formatSlDateTime, Granularity, OrderFacts, PeriodStats, PeriodTotals,
  SL_OFFSET_MS, Slice, WindowAnalysis,
} from '@/lib/orderReports';

export type ReportPdfInput = {
  granularity: Granularity;
  rangeTitle: string;
  windowLabel: string;
  generatedAt: number;
  periods: PeriodStats[];
  totals: PeriodTotals;
  analysis: WindowAnalysis;
  backlogAll: Backlog;
  summary: { g: Granularity; current: PeriodStats; previous?: PeriodStats }[];
};

// html2canvas draws the whole report as one image, so very long lists are capped.
const MAX_ORDER_ROWS = 250;
const MAX_BACKLOG_ROWS = 150;

// A4 less 10 mm side margins is about 718 px wide; stay inside it.
const PAGE_WIDTH = 700;
const HALF = (PAGE_WIDTH - 16) / 2;
const theme = chartTheme(false);
const INK = '#0b0b0b';
const MUTED = '#5f5e59';
const RULE = '#e4e3df';
const BAND = '#f5f5f3';
const ACCENT = '#1d4f91';

const css = `
#report-pdf { width: ${PAGE_WIDTH}px; margin: 0 auto; padding: 0 0 16px; background: #fff; color: ${INK};
  font-family: Inter, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 11px; line-height: 1.4; }
#report-pdf * { box-sizing: border-box; }
#report-pdf h2 { font-size: 15px; font-weight: 700; margin: 0 0 2px; color: ${INK}; }
#report-pdf h3 { font-size: 12px; font-weight: 600; margin: 0 0 6px; color: ${INK}; }
#report-pdf .sub { color: ${MUTED}; font-size: 10px; margin: 0 0 10px; }
#report-pdf section { margin: 0 0 22px; }
#report-pdf .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
#report-pdf .muted { color: ${MUTED}; }
#report-pdf .card { border: 1px solid ${RULE}; border-radius: 8px; padding: 10px 12px; }
#report-pdf .g-head, #report-pdf .g-row, #report-pdf .g-foot { display: grid; column-gap: 8px; padding: 4px 6px; font-size: 10px; }
#report-pdf .g-head { font-weight: 600; color: ${MUTED}; background: ${BAND}; border-bottom: 1px solid ${RULE}; }
#report-pdf .g-row { border-bottom: 1px solid ${RULE}; }
#report-pdf .g-foot { font-weight: 700; border-top: 1px solid ${INK}; }
`;

type Col = { label: string; width: string; num?: boolean };
type GridRow = { key: string; cells: React.ReactNode[] };

/**
 * A table drawn as one block per row, so the PDF page breaks fall cleanly
 * between rows (html2pdf cannot pad inside a real <table>).
 */
const GridTable = ({ cols, rows, footer }: { cols: Col[]; rows: GridRow[]; footer?: React.ReactNode[] }) => {
  const template = { gridTemplateColumns: cols.map((c) => c.width).join(' ') };
  const cells = (values: React.ReactNode[]) =>
    values.map((v, i) => (
      <div key={i} className={cols[i]?.num ? 'num' : undefined} style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{v}</div>
    ));
  return (
    <div>
      <div className="g-head pdf-row" style={template}>{cells(cols.map((c) => c.label))}</div>
      {rows.map((r) => <div key={r.key} className="g-row pdf-row" style={template}>{cells(r.cells)}</div>)}
      {footer && <div className="g-foot pdf-row" style={template}>{cells(footer)}</div>}
    </div>
  );
};

const Section = ({ title, sub, children, avoid = true }: { title: string; sub?: string; children: React.ReactNode; avoid?: boolean }) => (
  <section className={avoid ? 'pdf-avoid' : undefined}>
    <h2>{title}</h2>
    {sub && <p className="sub">{sub}</p>}
    {children}
  </section>
);

const Kpi = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="card">
    <div style={{ color: MUTED, fontSize: 9.5, fontWeight: 600 }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{value}</div>
    {sub && <div style={{ color: MUTED, fontSize: 9.5 }}>{sub}</div>}
  </div>
);

const KpiGrid = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>{children}</div>
);

const sliceRows = (rows: Slice[], total: number, swatches: boolean): GridRow[] =>
  rows.map((r, i) => ({
    key: r.name,
    cells: [
      <span key="n">
        {swatches && (
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, marginRight: 5, background: i < 7 ? theme.series[i] : theme.other }} />
        )}
        {r.name}
      </span>,
      r.orders, `${total ? Math.round((r.orders / total) * 100) : 0}%`, r.units, formatRs(r.value),
      r.dispatchedUnits, r.remainingUnits, r.pendingOrders, r.completedOrders,
    ],
  }));

const SLICE_COLS = (name: string): Col[] => [
  { label: name, width: '1.6fr' },
  { label: 'Orders', width: '42px', num: true },
  { label: 'Share', width: '38px', num: true },
  { label: 'Units', width: '38px', num: true },
  { label: 'Value', width: '82px', num: true },
  { label: 'Sent', width: '34px', num: true },
  { label: 'To make', width: '44px', num: true },
  { label: 'Pending', width: '44px', num: true },
  { label: 'Done', width: '34px', num: true },
];

const sliceFooter = (rows: Slice[]) => [
  'Total', rows.reduce((s, r) => s + r.orders, 0), '', rows.reduce((s, r) => s + r.units, 0),
  formatRs(rows.reduce((s, r) => s + r.value, 0)), rows.reduce((s, r) => s + r.dispatchedUnits, 0),
  rows.reduce((s, r) => s + r.remainingUnits, 0), rows.reduce((s, r) => s + r.pendingOrders, 0),
  rows.reduce((s, r) => s + r.completedOrders, 0),
];

const OrdersTable = ({ orders, now, backlog }: { orders: OrderFacts[]; now: number; backlog?: boolean }) => {
  const cols: Col[] = backlog
    ? [
        { label: 'Order', width: '40px' },
        { label: 'Entered', width: '70px' },
        { label: 'Customer', width: '1.3fr' },
        { label: 'Sales person', width: '1fr' },
        { label: 'Status', width: '54px' },
        { label: 'Units', width: '32px', num: true },
        { label: 'Sent', width: '30px', num: true },
        { label: 'To make', width: '42px', num: true },
        { label: 'Waiting', width: '42px', num: true },
      ]
    : [
        { label: 'Order', width: '34px' },
        { label: 'Entered', width: '104px' },
        { label: 'Customer', width: '1fr' },
        { label: 'Sales person', width: '0.9fr' },
        { label: 'Items ordered', width: '1.3fr' },
        { label: 'Units', width: '28px', num: true },
        { label: 'Sent', width: '26px', num: true },
        { label: 'Value', width: '64px', num: true },
        { label: 'Status', width: '52px' },
      ];
  const rows: GridRow[] = orders.map((o) => ({
    key: o.id,
    cells: backlog
      ? [
          <b key="n">{o.formNumber}</b>, formatSlDate(o.createdAt), o.customer, o.salesPerson, statusLabel(o.status),
          o.units, o.dispatchedUnits, <b key="r">{o.remainingUnits}</b>, `${fmt1(daysBetween(o.createdAt, now) ?? 0)} d`,
        ]
      : [
          <b key="n">{o.formNumber}</b>, formatSlDateTime(o.createdAt), o.customer, o.salesPerson,
          <span key="l" className="muted">{o.itemLines.map((l, i) => <div key={i}>{l.units} × {l.size} {l.colour}</div>)}</span>,
          o.units, o.dispatchedUnits, formatRs(o.value), statusLabel(o.status),
        ],
  }));
  return <GridTable cols={cols} rows={rows} />;
};

const BacklogBlock = ({ title, sub, backlog, now }: { title: string; sub: string; backlog: Backlog; now: number }) => (
  <>
    <Section title={title} sub={`${backlog.units} units still to make in ${backlog.orders.length} orders. ${sub}`}>
      {backlog.orders.length === 0 ? <p className="muted">Nothing waiting to be made.</p> : (
        <RankedBarChart
          data={collapseBySize(backlog.bySizeColour).slice(0, 12)}
          color={theme.series[1]}
          theme={theme}
          unit="Units to make"
          width={PAGE_WIDTH}
          labelWidth={80}
          animate={false}
        />
      )}
    </Section>
    {backlog.bySizeColour.length > 0 && (
      <Section title="By size and top colour" avoid={false}>
        <GridTable
          cols={[{ label: 'Size', width: '1fr' }, { label: 'Top colour', width: '1.5fr' }, { label: 'Units', width: '60px', num: true }]}
          rows={backlog.bySizeColour.map((r) => ({ key: `${r.size}|${r.colour}`, cells: [r.size, r.colour, r.units] }))}
          footer={['Total', '', backlog.units]}
        />
      </Section>
    )}
    {backlog.orders.length > 0 && (
      <Section
        title="Orders waiting"
        sub={`Oldest first${backlog.orders.length > MAX_BACKLOG_ROWS ? `, first ${MAX_BACKLOG_ROWS} of ${backlog.orders.length}` : ''}.`}
        avoid={false}
      >
        <OrdersTable orders={backlog.orders.slice(0, MAX_BACKLOG_ROWS)} now={now} backlog />
      </Section>
    )}
  </>
);

const Ranked = ({ title, sub, data, unit, width, labelWidth, color = theme.series[0] }: {
  title: string; sub: string; data: { name: string; value: number }[]; unit: string; width: number; labelWidth: number; color?: string;
}) => (
  <div style={{ width }}>
    <h2>{title}</h2>
    <p className="sub">{sub}</p>
    {data.length === 0 ? <p className="muted">No data.</p> : (
      <RankedBarChart data={data} color={color} theme={theme} unit={unit} width={width} labelWidth={labelWidth} animate={false} />
    )}
  </div>
);

const ReportPdf = ({ d }: { d: ReportPdfInput }) => {
  const unit = PERIOD_NAMES[d.granularity].unit;
  const { analysis: a, totals } = d;
  const now = d.generatedAt;

  return (
    <div id="report-pdf">
      <style>{css}</style>

      {/* Title band */}
      <div className="pdf-avoid" style={{ background: ACCENT, color: '#fff', borderRadius: 10, padding: '18px 20px', marginBottom: 18 }}>
        <div style={{ fontSize: 11, opacity: 0.85, letterSpacing: 1, textTransform: 'uppercase' }}>TableFlow</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>Order Report</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>{d.windowLabel}</div>
        <div style={{ fontSize: 10, opacity: 0.85, marginTop: 6 }}>
          {d.rangeTitle}, grouped by {unit.toLowerCase()}. Generated {formatSlDateTime(now)} (Sri Lanka time). A day runs 5:00 PM to 5:00 PM.
        </div>
      </div>

      <Section title="Activity in this range" sub="What happened between the start and end of the range.">
        <KpiGrid>
          <Kpi label="Orders entered" value={a.orders.length.toLocaleString()} sub={`${a.units} units · ${a.itemLines} item lines`} />
          <Kpi label="Order value" value={formatRsShort(a.value)} sub={`average ${formatRs(a.avgOrderValue)}`} />
          <Kpi label="Units dispatched" value={a.unitsDispatched.toLocaleString()} sub={`${a.ordersDispatched} orders first dispatched`} />
          <Kpi label="Orders completed" value={a.ordersCompleted.toLocaleString()} sub={a.unitsReturned ? `${a.unitsReturned} units returned` : 'No returns'} />
          <Kpi label="Units per order" value={fmt1(a.avgUnitsPerOrder)} sub={`${fmt1(a.avgItemsPerOrder)} item lines per order`} />
          <Kpi label="Delivery fees" value={formatRsShort(a.deliveryFees)} sub={`extra charges ${formatRs(a.additionalCharges)}`} />
          <Kpi
            label="Entry to dispatch"
            value={a.medianDaysToDispatch === null ? '—' : `${fmt1(a.medianDaysToDispatch)} days`}
            sub={a.avgDaysToDispatch === null ? 'no dispatches' : `median · average ${fmt1(a.avgDaysToDispatch)} days`}
          />
          <Kpi label="Gate pass scans" value={a.dispatchScans.toLocaleString()} sub={`${a.vehicles.length} vehicles used`} />
        </KpiGrid>
      </Section>

      <Section title="Orders entered in this range: where they stand now" sub="Status and dispatch progress at the time of this report.">
        <KpiGrid>
          <Kpi label="Still to manufacture" value={`${a.remainingUnits} units`} sub={`in ${a.ordersToMake} orders`} />
          <Kpi label="Units dispatched so far" value={a.dispatchedUnitsOfThese.toLocaleString()} sub={`of ${a.units} units ordered`} />
          <Kpi label="Fully dispatched" value={a.fullyDispatched.toLocaleString()} sub={`${a.partlyDispatched} partly dispatched`} />
          <Kpi label="Not dispatched yet" value={a.notDispatched.toLocaleString()} sub={`of ${a.orders.length} orders`} />
        </KpiGrid>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {a.byStatus.map((s) => (
            <div key={s.name} className="card" style={{ padding: '6px 10px' }}>
              <span className="muted">{statusLabel(s.name)}: </span>
              <b>{s.count}</b> <span className="muted">orders · {s.units} units</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="At a glance" sub="Current periods; previous period after the slash.">
        <GridTable
          cols={[
            { label: 'Period', width: '1.6fr' },
            { label: 'Orders entered', width: '1fr', num: true },
            { label: 'Units entered', width: '1fr', num: true },
            { label: 'Units dispatched', width: '1fr', num: true },
            { label: 'Orders completed', width: '1fr', num: true },
          ]}
          rows={d.summary.map(({ g, current, previous }) => ({
            key: g,
            cells: [
              <span key="p"><b>{PERIOD_NAMES[g].current}</b><div className="muted" style={{ fontSize: 9 }}>{current.range}</div></span>,
              ...(['ordersEntered', 'unitsEntered', 'unitsDispatched', 'ordersCompleted'] as const).map((k) => (
                <span key={k}><b>{current[k]}</b>{previous && <span className="muted"> / {previous[k]}</span>}</span>
              )),
            ],
          }))}
        />
      </Section>

      <Section title={`Orders by ${unit.toLowerCase()}`} sub="Entered by order date, dispatched by first gate pass scan, completed by completion date.">
        <PeriodBarChart
          data={d.periods}
          theme={theme}
          width={PAGE_WIDTH}
          height={240}
          animate={false}
          series={[
            { key: 'ordersEntered', label: 'Orders entered', color: theme.series[0] },
            { key: 'ordersDispatched', label: 'Orders dispatched', color: theme.series[1] },
            { key: 'ordersCompleted', label: 'Orders completed', color: theme.series[2] },
          ]}
        />
      </Section>

      <Section title={`Units entered and dispatched by ${unit.toLowerCase()}`} sub="Units are table quantities: an order of 3 tables counts 3 units.">
        <PeriodBarChart
          data={d.periods}
          theme={theme}
          width={PAGE_WIDTH}
          height={240}
          animate={false}
          series={[
            { key: 'unitsEntered', label: 'Units entered', color: theme.series[0] },
            { key: 'unitsDispatched', label: 'Units dispatched', color: theme.series[1] },
          ]}
        />
      </Section>

      <Section title={`${unit} by ${unit.toLowerCase()}`} sub="Newest first. Rows marked (part) only count what falls inside the range." avoid={false}>
        <GridTable
          cols={[
            { label: unit, width: '1.3fr' },
            { label: 'Orders in', width: '46px', num: true },
            { label: 'Units in', width: '42px', num: true },
            { label: 'Value', width: '84px', num: true },
            { label: 'Orders out', width: '52px', num: true },
            { label: 'Units out', width: '46px', num: true },
            { label: 'Completed', width: '54px', num: true },
            { label: 'Returned', width: '48px', num: true },
          ]}
          rows={[...d.periods].reverse().map((p) => ({
            key: String(p.key),
            cells: [
              <span key="l"><b>{p.label}{p.isCurrent ? ' (so far)' : p.isPartial ? ' (part)' : ''}</b><div className="muted" style={{ fontSize: 9 }}>{p.range}</div></span>,
              p.ordersEntered, p.unitsEntered, formatRs(p.valueEntered), p.ordersDispatched, p.unitsDispatched, p.ordersCompleted, p.unitsReturned,
            ],
          }))}
          footer={[
            'Total', totals.ordersEntered, totals.unitsEntered, formatRs(totals.valueEntered), totals.ordersDispatched,
            totals.unitsDispatched, totals.ordersCompleted, totals.unitsReturned,
          ]}
        />
      </Section>

      <Section title="Sales people" sub="Orders entered in the range by each sales person, and where those orders stand now.">
        {a.salesPeople.length === 0 ? <p className="muted">No orders in this range.</p> : (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <DonutChart
                slices={toDonutSlices(a.salesPeople, theme)}
                theme={theme}
                size={200}
                animate={false}
                centerValue={a.orders.length.toLocaleString()}
                centerLabel="orders"
              />
            </div>
            <GridTable cols={SLICE_COLS('Sales person')} rows={sliceRows(a.salesPeople, a.orders.length, true)} footer={sliceFooter(a.salesPeople)} />
          </>
        )}
      </Section>

      <BacklogBlock
        title="To manufacture: orders from this range"
        sub="Orders entered in the range that are not completed or cancelled."
        backlog={a.backlog}
        now={now}
      />

      <BacklogBlock
        title="To manufacture: all open orders"
        sub="Every open order, whenever it was entered."
        backlog={d.backlogAll}
        now={now}
      />

      <section className="pdf-avoid">
        <div style={{ display: 'flex', gap: 16 }}>
          <Ranked title="Dispatch by vehicle" sub="Units dispatched in the range." data={a.vehicles.map((v) => ({ name: v.name, value: v.units }))} unit="Units" width={HALF} labelWidth={130} color={theme.series[1]} />
          <div style={{ width: HALF }}>
            <h2>Delivery type</h2>
            <p className="sub">Orders entered in the range.</p>
            <GridTable
              cols={[
                { label: 'Type', width: '1fr' },
                { label: 'Orders', width: '44px', num: true },
                { label: 'Units', width: '40px', num: true },
                { label: 'Value', width: '80px', num: true },
              ]}
              rows={a.deliveryTypes.map((t) => ({ key: t.name, cells: [t.name, t.orders, t.units, formatRs(t.value)] }))}
            />
          </div>
        </div>
      </section>

      <section className="pdf-avoid">
        <div style={{ display: 'flex', gap: 16 }}>
          <Ranked title="Table sizes" sub="Units ordered in the range." data={a.sizes.slice(0, 12).map((s) => ({ name: s.name, value: s.units }))} unit="Units" width={HALF} labelWidth={70} />
          <Ranked title="Top colours" sub="Units ordered by top colour." data={a.colours.slice(0, 12).map((s) => ({ name: s.name, value: s.units }))} unit="Units" width={HALF} labelWidth={90} />
        </div>
      </section>

      <section className="pdf-avoid">
        <div style={{ display: 'flex', gap: 16 }}>
          <Ranked title="Leg colours" sub="Units ordered by leg colour." data={a.legColours.slice(0, 12).map((s) => ({ name: s.name, value: s.units }))} unit="Units" width={HALF} labelWidth={90} />
          <Ranked title="Districts" sub="Orders entered by customer district." data={a.districts.slice(0, 12).map((s) => ({ name: s.name, value: s.orders }))} unit="Orders" width={HALF} labelWidth={100} />
        </div>
      </section>

      <Section title="When orders come in" sub="Orders entered in the range by hour of day (Sri Lanka time) and by business day of the week.">
        <PeriodBarChart
          data={a.byHour.map((h) => ({ shortLabel: formatHour(h.hour), label: formatHour(h.hour), range: '', isCurrent: false, orders: h.orders }))}
          series={[{ key: 'orders', label: 'Orders by hour', color: theme.series[0] }]}
          theme={theme}
          width={PAGE_WIDTH}
          height={190}
          animate={false}
        />
        <PeriodBarChart
          data={a.byWeekday.map((w) => ({ shortLabel: w.day, label: w.day, range: '', isCurrent: false, orders: w.orders, units: w.units }))}
          series={[
            { key: 'orders', label: 'Orders by weekday', color: theme.series[0] },
            { key: 'units', label: 'Units by weekday', color: theme.series[3] },
          ]}
          theme={theme}
          width={PAGE_WIDTH}
          height={190}
          animate={false}
        />
      </Section>

      <Section
        title="Orders entered in this range"
        sub={`${a.orders.length} orders, newest first${a.orders.length > MAX_ORDER_ROWS ? ` (first ${MAX_ORDER_ROWS} listed)` : ''}. Sent = units dispatched.`}
        avoid={false}
      >
        <OrdersTable orders={a.orders.slice(0, MAX_ORDER_ROWS)} now={now} />
      </Section>

      <p className="muted" style={{ fontSize: 9 }}>
        Dispatched figures come from gate pass scans. When the same item is scanned more than once within 10 minutes it
        is counted once. Order value is the order total including delivery fee and extra charges.
      </p>
    </div>
  );
};

// requestAnimationFrame never fires in a hidden tab, so fall back to a timer.
const nextFrame = () => new Promise<void>((resolve) => {
  const timer = setTimeout(resolve, 100);
  requestAnimationFrame(() => { clearTimeout(timer); resolve(); });
});

type PdfDoc = {
  internal: { getNumberOfPages: () => number; pageSize: { getWidth: () => number; getHeight: () => number } };
  setPage: (n: number) => void;
  setFontSize: (n: number) => void;
  setTextColor: (n: number) => void;
  text: (t: string, x: number, y: number, o?: { align: string }) => void;
};

export const exportReportPdf = async (input: ReportPdfInput) => {
  const html2pdf = (await import('html2pdf.js')).default;

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.background = '#ffffff';
  document.body.appendChild(host);
  const root = createRoot(host);

  try {
    root.render(<ReportPdf d={input} />);
    // Let React commit and the charts lay out before taking the snapshot.
    await nextFrame();
    await nextFrame();
    await new Promise((r) => setTimeout(r, 150));

    const el = host.querySelector('#report-pdf') as HTMLElement;
    const day = (ms: number) => new Date(ms + SL_OFFSET_MS).toISOString().slice(0, 10);
    const filename = `order-report-${day(input.analysis.startMs)}-to-${day(Math.min(input.analysis.endMs, input.generatedAt))}.pdf`;
    await html2pdf()
      .set({
        margin: [10, 10, 12, 10],
        filename,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: PAGE_WIDTH },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['.pdf-avoid', '.pdf-row'] },
      })
      .from(el)
      .toPdf()
      .get('pdf')
      .then((pdf: PdfDoc) => {
        const pages = pdf.internal.getNumberOfPages();
        const w = pdf.internal.pageSize.getWidth();
        const h = pdf.internal.pageSize.getHeight();
        for (let i = 1; i <= pages; i++) {
          pdf.setPage(i);
          pdf.setFontSize(8);
          pdf.setTextColor(130);
          pdf.text(`TableFlow order report  ·  Page ${i} of ${pages}`, w / 2, h - 5, { align: 'center' });
        }
      })
      .save();
  } finally {
    root.unmount();
    document.body.removeChild(host);
  }
};
