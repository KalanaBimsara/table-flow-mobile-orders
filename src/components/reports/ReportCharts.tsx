import React, { useEffect, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

// Validated categorical palette (light / dark steps of the same hues), in fixed order.
const CATEGORICAL = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#0ca30c', '#9085e9'],
};

export type ChartTheme = {
  series: string[];
  other: string;
  text: string;
  muted: string;
  grid: string;
  surface: string;
  tooltipBg: string;
  tooltipBorder: string;
};

export const chartTheme = (dark: boolean): ChartTheme => ({
  series: dark ? CATEGORICAL.dark : CATEGORICAL.light,
  other: dark ? '#6b6a64' : '#a3a29c',
  text: dark ? '#f0efec' : '#0b0b0b',
  muted: dark ? '#a8a79f' : '#6b6a64',
  grid: dark ? '#2c2c2a' : '#e8e7e3',
  surface: dark ? '#0b0f19' : '#ffffff',
  tooltipBg: dark ? '#111827' : '#ffffff',
  tooltipBorder: dark ? '#374151' : '#e5e7eb',
});

/** Follows the app's light/dark toggle (the `dark` class on <html>). */
export const useIsDark = () => {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() => setDark(el.classList.contains('dark')));
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return dark;
};

/** Fixed size for the PDF, or fill the parent on screen. */
const Frame = ({ width, height, children }: { width?: number; height: number; children: React.ReactElement }) =>
  width
    ? React.cloneElement(children, { width, height })
    : <div style={{ width: '100%', height }}><ResponsiveContainer>{children}</ResponsiveContainer></div>;

type TooltipRow = { name: string; value: number; color: string };

const TooltipBox = ({ theme, title, subtitle, rows }: { theme: ChartTheme; title: string; subtitle?: string; rows: TooltipRow[] }) => (
  <div
    style={{ background: theme.tooltipBg, border: `1px solid ${theme.tooltipBorder}`, color: theme.text }}
    className="min-w-[10rem] rounded-lg px-3 py-2 text-xs shadow-lg"
  >
    <div className="font-medium">{title}</div>
    {subtitle && <div style={{ color: theme.muted }}>{subtitle}</div>}
    <div className="mt-1.5 space-y-1">
      {rows.map((r) => (
        <div key={r.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5" style={{ color: theme.muted }}>
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: r.color }} />
            {r.name}
          </span>
          <span className="font-medium tabular-nums">{r.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  </div>
);

export type SeriesDef = { key: string; label: string; color: string };

type PeriodDatum = { shortLabel: string; label: string; range: string; isCurrent: boolean } & Record<string, unknown>;

/** Grouped bars per period, one bar per series. */
export const PeriodBarChart = ({
  data, series, theme, height = 300, width, animate = true,
}: {
  data: PeriodDatum[];
  series: SeriesDef[];
  theme: ChartTheme;
  height?: number;
  width?: number;
  animate?: boolean;
}) => (
  <Frame width={width} height={height}>
    <BarChart data={data} barGap={2} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
      <CartesianGrid vertical={false} stroke={theme.grid} />
      <XAxis
        dataKey="shortLabel"
        tickLine={false}
        axisLine={{ stroke: theme.grid }}
        tickMargin={8}
        minTickGap={12}
        tick={{ fill: theme.muted, fontSize: 11 }}
      />
      <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={44} tick={{ fill: theme.muted, fontSize: 11 }} />
      {animate && (
        <Tooltip
          cursor={{ fill: theme.grid, fillOpacity: 0.6 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as PeriodDatum;
            return (
              <TooltipBox
                theme={theme}
                title={`${p.label}${p.isCurrent ? ' (so far)' : ''}`}
                subtitle={p.range}
                rows={series.map((s) => ({ name: s.label, value: Number(p[s.key]) || 0, color: s.color }))}
              />
            );
          }}
        />
      )}
      <Legend
        iconType="square"
        iconSize={10}
        wrapperStyle={{ fontSize: 12, color: theme.muted, paddingTop: 8 }}
        formatter={(value) => <span style={{ color: theme.muted }}>{value}</span>}
      />
      {series.map((s) => (
        <Bar
          key={s.key}
          dataKey={s.key}
          name={s.label}
          fill={s.color}
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
          isAnimationActive={animate}
        />
      ))}
    </BarChart>
  </Frame>
);

/** Ranked horizontal bars with the value printed at the end of each bar. */
export const RankedBarChart = ({
  data, color, theme, unit, width, animate = true, labelWidth = 110,
}: {
  data: { name: string; value: number }[];
  color: string;
  theme: ChartTheme;
  unit: string;
  width?: number;
  animate?: boolean;
  labelWidth?: number;
}) => {
  const height = Math.max(80, data.length * 30 + 16);
  return (
    <Frame width={width} height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 40, top: 4, bottom: 4 }} barCategoryGap={6}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={labelWidth}
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={{ fill: theme.text, fontSize: 11 }}
        />
        {animate && (
          <Tooltip
            cursor={{ fill: theme.grid, fillOpacity: 0.6 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as { name: string; value: number };
              return <TooltipBox theme={theme} title={p.name} rows={[{ name: unit, value: p.value, color }]} />;
            }}
          />
        )}
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={animate}>
          <LabelList dataKey="value" position="right" style={{ fill: theme.text, fontSize: 11 }} />
        </Bar>
      </BarChart>
    </Frame>
  );
};

export type DonutSlice = { name: string; value: number; color: string };

/** Share of a whole. Callers fold anything past seven slices into "Other". */
export const DonutChart = ({
  slices, theme, size = 220, animate = true, centerLabel, centerValue,
}: {
  slices: DonutSlice[];
  theme: ChartTheme;
  size?: number;
  animate?: boolean;
  centerLabel: string;
  centerValue: string;
}) => (
  <div className="relative mx-auto" style={{ width: size, height: size }}>
    <PieChart width={size} height={size}>
      <Pie
        data={slices}
        dataKey="value"
        nameKey="name"
        innerRadius={size * 0.3}
        outerRadius={size * 0.48}
        paddingAngle={slices.length > 1 ? 1 : 0}
        stroke={theme.surface}
        strokeWidth={2}
        isAnimationActive={animate}
      >
        {slices.map((s) => <Cell key={s.name} fill={s.color} />)}
      </Pie>
      {animate && (
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as DonutSlice;
            return <TooltipBox theme={theme} title={p.name} rows={[{ name: 'Orders', value: p.value, color: p.color }]} />;
          }}
        />
      )}
    </PieChart>
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
      <span className="text-2xl font-semibold tabular-nums" style={{ color: theme.text }}>{centerValue}</span>
      <span className="text-xs" style={{ color: theme.muted }}>{centerLabel}</span>
    </div>
  </div>
);

/** Top seven by orders, the rest folded into "Other", coloured in fixed slot order. */
export const toDonutSlices = (rows: { name: string; orders: number }[], theme: ChartTheme): DonutSlice[] => {
  const top = rows.slice(0, 7).map((r, i) => ({ name: r.name, value: r.orders, color: theme.series[i] }));
  const rest = rows.slice(7).reduce((sum, r) => sum + r.orders, 0);
  return rest > 0 ? [...top, { name: 'Other', value: rest, color: theme.other }] : top;
};
