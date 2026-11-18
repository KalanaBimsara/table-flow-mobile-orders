// Report maths for the Reports page.
//
// A business day runs 5:00 PM to 5:00 PM Sri Lanka time (UTC+5:30). The day is
// named after the date it ends on: an order entered at 6:00 PM on 17 Nov counts
// for 18 Nov. Weeks (Monday to Sunday), months and years are built from those
// business days, so they also start and end at 5:00 PM.
//
// "Dispatched" comes from GATE PASS scans in dispatch_return_logs, the same
// records the Dispatch & Return page lists. The factory phone often saves one
// scan several times within a second, so repeated scans are collapsed first.
//
// Every figure is for a window [startMs, endMs). "Activity" figures count what
// happened inside the window (entered, dispatched, completed, returned).
// "Standing" figures take the orders entered in the window and describe where
// they are now (status, how much is dispatched, what is still to make).

export const SL_OFFSET_MS = 5.5 * 60 * 60 * 1000;
// Shifting Sri Lanka time forward 7 hours turns the 5:00 PM cut-off into midnight.
const CUTOFF_SHIFT_MS = 7 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;
// Scans of the same order item and quantity this close together are one dispatch.
const DUPLICATE_SCAN_WINDOW_MS = 10 * 60 * 1000;

export type Granularity = 'day' | 'week' | 'month' | 'year';

export const CLOSED_STATUSES = ['completed', 'cancelled'];

// ---------------------------------------------------------------- raw rows

export type ReportOrderRow = {
  id: string;
  order_form_number: string | null;
  customer_name: string | null;
  customer_district: string | null;
  sales_person_name: string | null;
  status: string | null;
  delivery_type: string | null;
  price: number | null;
  delivery_fee: number | null;
  additional_charges: number | null;
  created_at: string | null;
  completed_at: string | null;
};

export type ReportItemRow = {
  order_id: string | null;
  size: string;
  colour: string | null;
  top_colour: string | null;
  frame_colour: string | null;
  quantity: number;
};

export type ReportScanRow = {
  order_id: string | null;
  order_form_number: string;
  operation_mode: string;
  vehicle_number: string | null;
  table_size: string | null;
  colour: string | null;
  quantity: number;
  created_at: string;
};

// ---------------------------------------------------------------- derived

export type DispatchEvent = { orderId: string; units: number; at: number; isReturn: boolean; vehicle: string };

export type ItemLine = { size: string; colour: string; legColour: string; units: number };

export type OrderFacts = {
  id: string;
  formNumber: string;
  customer: string;
  salesPerson: string;
  district: string;
  deliveryType: string;
  status: string;
  value: number;
  deliveryFee: number;
  additionalCharges: number;
  createdAt: number | null;
  completedAt: number | null;
  items: number;
  units: number;
  dispatchedUnits: number;
  returnedUnits: number;
  firstDispatchAt: number | null;
  remainingUnits: number;
  itemLines: ItemLine[];
};

export type ReportModel = {
  orders: OrderFacts[];
  events: DispatchEvent[];
  unmatchedScans: number;
  earliestMs: number | null;
};

const norm = (v: string | null | undefined) => (v || '').trim().toLowerCase().replace(/[\s_]+/g, '');

export const formatColourName = (value: string | null | undefined) =>
  (value || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();

const toMs = (iso: string | null | undefined) => {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return isNaN(ms) ? null : ms;
};

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Collapses repeated saves of the same scan, keeping the first. */
const collapseRepeatedScans = (scans: (ReportScanRow & { at: number; orderId: string })[]) => {
  const lastKept = new Map<string, number>();
  return [...scans]
    .sort((a, b) => a.at - b.at)
    .filter((s) => {
      const key = [s.orderId, norm(s.operation_mode), norm(s.table_size), norm(s.colour), s.quantity].join('|');
      const prev = lastKept.get(key);
      if (prev !== undefined && s.at - prev < DUPLICATE_SCAN_WINDOW_MS) return false;
      lastKept.set(key, s.at);
      return true;
    });
};

const DELIVERY_TYPES: Record<string, string> = { courier: 'Courier', 'non-courier': 'Non-courier' };

export const buildReportModel = (
  orderRows: ReportOrderRow[],
  itemRows: ReportItemRow[],
  scanRows: ReportScanRow[],
): ReportModel => {
  const itemsByOrder = new Map<string, ReportItemRow[]>();
  for (const item of itemRows) {
    if (!item.order_id) continue;
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  const orderIdByForm = new Map<string, string>();
  for (const o of orderRows) {
    if (o.order_form_number) orderIdByForm.set(o.order_form_number.trim(), o.id);
  }
  const knownIds = new Set(orderRows.map((o) => o.id));

  let unmatchedScans = 0;
  const located: (ReportScanRow & { at: number; orderId: string })[] = [];
  for (const s of scanRows) {
    const at = toMs(s.created_at);
    const orderId = s.order_id && knownIds.has(s.order_id)
      ? s.order_id
      : orderIdByForm.get((s.order_form_number || '').trim());
    if (at === null || !orderId) { unmatchedScans += 1; continue; }
    const quantity = num(s.quantity);
    located.push({ ...s, quantity: quantity > 0 ? quantity : 0, at, orderId });
  }

  const events: DispatchEvent[] = collapseRepeatedScans(located).map((s) => ({
    orderId: s.orderId,
    units: s.quantity,
    at: s.at,
    isReturn: norm(s.operation_mode).includes('return'),
    vehicle: s.vehicle_number?.trim() || 'Not recorded',
  }));

  const dispatchByOrder = new Map<string, { dispatched: number; returned: number; first: number | null }>();
  for (const e of events) {
    const d = dispatchByOrder.get(e.orderId) ?? { dispatched: 0, returned: 0, first: null };
    if (e.isReturn) {
      d.returned += e.units;
    } else {
      d.dispatched += e.units;
      if (d.first === null || e.at < d.first) d.first = e.at;
    }
    dispatchByOrder.set(e.orderId, d);
  }

  let earliestMs: number | null = null;
  const seen = (ms: number | null) => {
    if (ms !== null && (earliestMs === null || ms < earliestMs)) earliestMs = ms;
  };

  const orders: OrderFacts[] = orderRows.map((o) => {
    const items = itemsByOrder.get(o.id) ?? [];
    const units = items.reduce((sum, i) => sum + num(i.quantity), 0);
    const d = dispatchByOrder.get(o.id) ?? { dispatched: 0, returned: 0, first: null };
    const status = (o.status || 'pending').toLowerCase();
    const createdAt = toMs(o.created_at);
    seen(createdAt);
    return {
      id: o.id,
      formNumber: o.order_form_number?.trim() || '—',
      customer: o.customer_name?.trim() || '—',
      salesPerson: o.sales_person_name?.trim() || 'Not set',
      district: o.customer_district?.trim() || 'Not set',
      deliveryType: DELIVERY_TYPES[(o.delivery_type || '').toLowerCase()] ?? (o.delivery_type?.trim() || 'Not set'),
      status,
      value: num(o.price),
      deliveryFee: num(o.delivery_fee),
      additionalCharges: num(o.additional_charges),
      createdAt,
      completedAt: toMs(o.completed_at),
      items: items.length,
      units,
      dispatchedUnits: d.dispatched,
      returnedUnits: d.returned,
      firstDispatchAt: d.first,
      remainingUnits: CLOSED_STATUSES.includes(status) ? 0 : Math.max(0, units - d.dispatched),
      itemLines: items.map((i) => ({
        size: i.size,
        colour: formatColourName(i.top_colour || i.colour) || '—',
        legColour: formatColourName(i.frame_colour) || 'Not set',
        units: num(i.quantity),
      })),
    };
  });
  events.forEach((e) => seen(e.at));

  return { orders, events, unmatchedScans, earliestMs };
};

// ---------------------------------------------------------------- business days

/** Business day number (days since 1970-01-01) for a UTC timestamp in ms. */
export const businessDayOf = (utcMs: number) =>
  Math.floor((utcMs + SL_OFFSET_MS + CUTOFF_SHIFT_MS) / DAY_MS);

/** UTC ms at which business day `day` starts (5:00 PM Sri Lanka time the evening before). */
export const dayStartMs = (day: number) => day * DAY_MS - SL_OFFSET_MS - CUTOFF_SHIFT_MS;

const dayDate = (day: number) => new Date(day * DAY_MS); // read with getUTC*

const mondayOf = (day: number) => day - ((dayDate(day).getUTCDay() + 6) % 7);

const monthKeyOf = (day: number) => {
  const d = dayDate(day);
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
};

const firstDayOfMonthKey = (monthKey: number) =>
  Math.round(Date.UTC(Math.floor(monthKey / 12), monthKey % 12, 1) / DAY_MS);

const firstDayOfYear = (year: number) => Math.round(Date.UTC(year, 0, 1) / DAY_MS);

const periodKeyOf = (day: number, g: Granularity) => {
  switch (g) {
    case 'day': return day;
    case 'week': return mondayOf(day);
    case 'month': return monthKeyOf(day);
    case 'year': return dayDate(day).getUTCFullYear();
  }
};

const firstDayOfPeriod = (key: number, g: Granularity) => {
  switch (g) {
    case 'day':
    case 'week': return key;
    case 'month': return firstDayOfMonthKey(key);
    case 'year': return firstDayOfYear(key);
  }
};

/** UTC ms at which the period containing `ms` starts. */
export const periodStartOf = (ms: number, g: Granularity) =>
  dayStartMs(firstDayOfPeriod(periodKeyOf(businessDayOf(ms), g), g));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const fmtDay = (day: number, withYear = false) => {
  const d = dayDate(day);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}${withYear ? ` ${d.getUTCFullYear()}` : ''}`;
};

/** "17 Nov 5:00 PM – 18 Nov 5:00 PM" for business days first..last inclusive. */
const fmtRange = (firstDay: number, lastDay: number, withYear = false) =>
  `${fmtDay(firstDay - 1, withYear)} 5:00 PM – ${fmtDay(lastDay, withYear)} 5:00 PM`;

const describe = (key: number, g: Granularity) => {
  switch (g) {
    case 'day': {
      const d = dayDate(key);
      return { shortLabel: fmtDay(key), label: `${WEEKDAYS[d.getUTCDay()]} ${fmtDay(key, true)}`, range: fmtRange(key, key) };
    }
    case 'week': {
      const end = key + 6;
      return { shortLabel: fmtDay(key), label: `Week ${fmtDay(key)} – ${fmtDay(end, true)}`, range: fmtRange(key, end) };
    }
    case 'month': {
      const name = `${MONTHS[key % 12]} ${Math.floor(key / 12)}`;
      return { shortLabel: name, label: name, range: fmtRange(firstDayOfMonthKey(key), firstDayOfMonthKey(key + 1) - 1) };
    }
    case 'year': {
      return { shortLabel: String(key), label: String(key), range: fmtRange(firstDayOfYear(key), firstDayOfYear(key + 1) - 1, true) };
    }
  }
};

const stepBack = (key: number, g: Granularity, steps: number) => (g === 'week' ? key - 7 * steps : key - steps);
const stepForward = (key: number, g: Granularity) => (g === 'week' ? key + 7 : key + 1);

// ---------------------------------------------------------------- periods

export type PeriodTotals = {
  ordersEntered: number;
  unitsEntered: number;
  valueEntered: number;
  ordersDispatched: number;
  unitsDispatched: number;
  ordersCompleted: number;
  unitsReturned: number;
};

export type PeriodStats = PeriodTotals & {
  key: number;
  shortLabel: string;
  label: string;
  range: string;
  isCurrent: boolean;
  isPartial: boolean;
  startMs: number;
};

const emptyTotals = (): PeriodTotals => ({
  ordersEntered: 0, unitsEntered: 0, valueEntered: 0, ordersDispatched: 0, unitsDispatched: 0, ordersCompleted: 0, unitsReturned: 0,
});

export const sumTotals = (rows: PeriodTotals[]): PeriodTotals =>
  rows.reduce((acc, r) => {
    (Object.keys(acc) as (keyof PeriodTotals)[]).forEach((k) => { acc[k] += r[k]; });
    return acc;
  }, emptyTotals());

export type ReportWindow = { startMs: number; endMs: number };

/** Window covering the last `count` periods up to now (`null` = since the first record). */
export const presetWindow = (model: ReportModel, g: Granularity, count: number | null, nowMs: number): ReportWindow => {
  const currentKey = periodKeyOf(businessDayOf(nowMs), g);
  const firstKey = count === null
    ? periodKeyOf(businessDayOf(model.earliestMs ?? nowMs), g)
    : stepBack(currentKey, g, count - 1);
  return { startMs: dayStartMs(firstDayOfPeriod(firstKey, g)), endMs: nowMs + 1 };
};

/**
 * One row per period touching the window, oldest first. Only activity inside
 * the window is counted, so the first and last periods of a custom range can
 * be partial.
 */
export const buildPeriods = (model: ReportModel, g: Granularity, win: ReportWindow, nowMs: number): PeriodStats[] => {
  const inWin = (ms: number | null) => ms !== null && ms >= win.startMs && ms < win.endMs;
  const firstKey = periodKeyOf(businessDayOf(win.startMs), g);
  const lastKey = periodKeyOf(businessDayOf(Math.max(win.startMs, win.endMs - 1)), g);
  const currentKey = periodKeyOf(businessDayOf(nowMs), g);

  const tallies = new Map<number, PeriodTotals>();
  const add = (ms: number | null, field: keyof PeriodTotals, amount = 1) => {
    if (!inWin(ms)) return;
    const key = periodKeyOf(businessDayOf(ms!), g);
    const t = tallies.get(key) ?? emptyTotals();
    t[field] += amount;
    tallies.set(key, t);
  };
  for (const o of model.orders) {
    add(o.createdAt, 'ordersEntered');
    add(o.createdAt, 'unitsEntered', o.units);
    add(o.createdAt, 'valueEntered', o.value);
    add(o.firstDispatchAt, 'ordersDispatched');
    add(o.completedAt, 'ordersCompleted');
  }
  for (const e of model.events) add(e.at, e.isReturn ? 'unitsReturned' : 'unitsDispatched', e.units);

  const rows: PeriodStats[] = [];
  for (let key = firstKey, guard = 0; key <= lastKey && guard < 5000; key = stepForward(key, g), guard++) {
    const startMs = dayStartMs(firstDayOfPeriod(key, g));
    const endMs = dayStartMs(firstDayOfPeriod(stepForward(key, g), g));
    rows.push({
      key,
      ...describe(key, g),
      isCurrent: key === currentKey,
      isPartial: key !== currentKey && (startMs < win.startMs || endMs > win.endMs),
      startMs,
      ...(tallies.get(key) ?? emptyTotals()),
    });
  }
  return rows;
};

/** Last `count` periods up to now. */
export const buildPeriodStats = (model: ReportModel, g: Granularity, count: number | null, nowMs: number) =>
  buildPeriods(model, g, presetWindow(model, g, count, nowMs), nowMs);

/** Chart bucket that keeps a window to a readable number of bars. */
export const suggestGranularity = (win: ReportWindow): Granularity => {
  const days = (win.endMs - win.startMs) / DAY_MS;
  if (days <= 62) return 'day';
  if (days <= 366) return 'week';
  if (days <= 1100) return 'month';
  return 'year';
};

// ---------------------------------------------------------------- breakdowns

export type Slice = {
  name: string;
  orders: number;
  units: number;
  value: number;
  dispatchedUnits: number;
  remainingUnits: number;
  pendingOrders: number;
  completedOrders: number;
};

const groupOrders = (orders: OrderFacts[], keyOf: (o: OrderFacts) => string): Slice[] => {
  const map = new Map<string, Slice>();
  for (const o of orders) {
    const name = keyOf(o);
    const s = map.get(name) ?? {
      name, orders: 0, units: 0, value: 0, dispatchedUnits: 0, remainingUnits: 0, pendingOrders: 0, completedOrders: 0,
    };
    s.orders += 1;
    s.units += o.units;
    s.value += o.value;
    s.dispatchedUnits += o.dispatchedUnits;
    s.remainingUnits += o.remainingUnits;
    if (o.status === 'pending') s.pendingOrders += 1;
    if (o.status === 'completed') s.completedOrders += 1;
    map.set(name, s);
  }
  return [...map.values()].sort((a, b) => b.orders - a.orders || b.units - a.units || a.name.localeCompare(b.name));
};

export type UnitsBy = { name: string; units: number };

const groupItemUnits = (orders: OrderFacts[], keyOf: (line: ItemLine) => string): UnitsBy[] => {
  const map = new Map<string, number>();
  for (const o of orders) for (const line of o.itemLines) {
    const name = keyOf(line);
    map.set(name, (map.get(name) ?? 0) + line.units);
  }
  return [...map.entries()]
    .map(([name, units]) => ({ name, units }))
    .sort((a, b) => b.units - a.units || a.name.localeCompare(b.name));
};

export type Backlog = {
  orders: OrderFacts[];
  units: number;
  bySizeColour: { size: string; colour: string; units: number }[];
};

/** Orders with units still to make, oldest first, and those units by size and top colour. */
export const buildBacklog = (allOrders: OrderFacts[]): Backlog => {
  const orders = allOrders
    .filter((o) => o.remainingUnits > 0)
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

  // Treat dispatched units as covering the largest items first, so partly
  // dispatched orders only add what is still to make.
  const map = new Map<string, { size: string; colour: string; units: number }>();
  for (const o of orders) {
    let left = o.remainingUnits;
    let covered = o.dispatchedUnits;
    for (const line of [...o.itemLines].sort((a, b) => b.units - a.units)) {
      const done = Math.min(line.units, covered);
      covered -= done;
      const units = Math.min(line.units - done, left);
      if (units <= 0) continue;
      left -= units;
      const key = `${line.size}|${line.colour}`;
      const entry = map.get(key) ?? { size: line.size, colour: line.colour, units: 0 };
      entry.units += units;
      map.set(key, entry);
    }
  }

  return {
    orders,
    units: orders.reduce((sum, o) => sum + o.remainingUnits, 0),
    bySizeColour: [...map.values()].sort((a, b) => b.units - a.units || a.size.localeCompare(b.size)),
  };
};

export type CountBy = { name: string; count: number; units: number };

export type WindowAnalysis = ReportWindow & {
  // Orders entered in the window
  orders: OrderFacts[];
  itemLines: number;
  units: number;
  value: number;
  deliveryFees: number;
  additionalCharges: number;
  avgOrderValue: number;
  avgItemsPerOrder: number;
  avgUnitsPerOrder: number;
  // ... and where they stand now
  byStatus: CountBy[];
  fullyDispatched: number;
  partlyDispatched: number;
  notDispatched: number;
  dispatchedUnitsOfThese: number;
  remainingUnits: number;
  ordersToMake: number;
  backlog: Backlog;
  // Activity inside the window
  unitsDispatched: number;
  ordersDispatched: number;
  unitsReturned: number;
  ordersCompleted: number;
  dispatchScans: number;
  vehicles: CountBy[];
  medianDaysToDispatch: number | null;
  avgDaysToDispatch: number | null;
  // Breakdowns of the orders entered
  salesPeople: Slice[];
  districts: Slice[];
  deliveryTypes: Slice[];
  sizes: UnitsBy[];
  colours: UnitsBy[];
  legColours: UnitsBy[];
  byHour: { hour: number; orders: number; units: number }[];
  byWeekday: { day: string; orders: number; units: number }[];
};

const STATUS_ORDER = ['pending', 'assigned', 'awaiting_approval', 'completed', 'cancelled'];

export const analyseWindow = (model: ReportModel, win: ReportWindow): WindowAnalysis => {
  const inWin = (ms: number | null) => ms !== null && ms >= win.startMs && ms < win.endMs;
  const orders = model.orders
    .filter((o) => inWin(o.createdAt))
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  const n = orders.length;
  const sum = (f: (o: OrderFacts) => number) => orders.reduce((s, o) => s + f(o), 0);

  const statusMap = new Map<string, CountBy>();
  for (const o of orders) {
    const s = statusMap.get(o.status) ?? { name: o.status, count: 0, units: 0 };
    s.count += 1;
    s.units += o.units;
    statusMap.set(o.status, s);
  }
  const rank = (s: string) => (STATUS_ORDER.includes(s) ? STATUS_ORDER.indexOf(s) : STATUS_ORDER.length);
  const byStatus = [...statusMap.values()].sort((a, b) => rank(a.name) - rank(b.name));

  const windowEvents = model.events.filter((e) => inWin(e.at));
  const vehicleMap = new Map<string, CountBy>();
  const vehicleOrders = new Map<string, Set<string>>();
  for (const e of windowEvents) {
    if (e.isReturn) continue;
    const v = vehicleMap.get(e.vehicle) ?? { name: e.vehicle, count: 0, units: 0 };
    v.units += e.units;
    vehicleMap.set(e.vehicle, v);
    const set = vehicleOrders.get(e.vehicle) ?? new Set<string>();
    set.add(e.orderId);
    vehicleOrders.set(e.vehicle, set);
  }
  vehicleMap.forEach((v, k) => { v.count = vehicleOrders.get(k)?.size ?? 0; });

  const leadDays = model.orders
    .filter((o) => inWin(o.firstDispatchAt) && o.createdAt !== null && o.firstDispatchAt! >= o.createdAt)
    .map((o) => (o.firstDispatchAt! - o.createdAt!) / DAY_MS)
    .sort((a, b) => a - b);
  const mid = Math.floor(leadDays.length / 2);

  const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0, units: 0 }));
  const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const byWeekday = weekdayNames.map((day) => ({ day, orders: 0, units: 0 }));
  for (const o of orders) {
    const local = new Date(o.createdAt! + SL_OFFSET_MS);
    byHour[local.getUTCHours()].orders += 1;
    byHour[local.getUTCHours()].units += o.units;
    // Weekday of the business day the order counts for.
    const wd = (dayDate(businessDayOf(o.createdAt!)).getUTCDay() + 6) % 7;
    byWeekday[wd].orders += 1;
    byWeekday[wd].units += o.units;
  }

  return {
    ...win,
    orders,
    itemLines: sum((o) => o.items),
    units: sum((o) => o.units),
    value: sum((o) => o.value),
    deliveryFees: sum((o) => o.deliveryFee),
    additionalCharges: sum((o) => o.additionalCharges),
    avgOrderValue: n ? sum((o) => o.value) / n : 0,
    avgItemsPerOrder: n ? sum((o) => o.items) / n : 0,
    avgUnitsPerOrder: n ? sum((o) => o.units) / n : 0,
    byStatus,
    fullyDispatched: orders.filter((o) => o.units > 0 && o.dispatchedUnits >= o.units).length,
    partlyDispatched: orders.filter((o) => o.dispatchedUnits > 0 && o.dispatchedUnits < o.units).length,
    notDispatched: orders.filter((o) => o.dispatchedUnits === 0).length,
    dispatchedUnitsOfThese: sum((o) => o.dispatchedUnits),
    remainingUnits: sum((o) => o.remainingUnits),
    ordersToMake: orders.filter((o) => o.remainingUnits > 0).length,
    backlog: buildBacklog(orders),
    unitsDispatched: windowEvents.filter((e) => !e.isReturn).reduce((s, e) => s + e.units, 0),
    ordersDispatched: model.orders.filter((o) => inWin(o.firstDispatchAt)).length,
    unitsReturned: windowEvents.filter((e) => e.isReturn).reduce((s, e) => s + e.units, 0),
    ordersCompleted: model.orders.filter((o) => inWin(o.completedAt)).length,
    dispatchScans: windowEvents.filter((e) => !e.isReturn).length,
    vehicles: [...vehicleMap.values()].sort((a, b) => b.units - a.units),
    medianDaysToDispatch: leadDays.length === 0 ? null : leadDays.length % 2 ? leadDays[mid] : (leadDays[mid - 1] + leadDays[mid]) / 2,
    avgDaysToDispatch: leadDays.length ? leadDays.reduce((s, d) => s + d, 0) / leadDays.length : null,
    salesPeople: groupOrders(orders, (o) => o.salesPerson),
    districts: groupOrders(orders, (o) => o.district),
    deliveryTypes: groupOrders(orders, (o) => o.deliveryType),
    sizes: groupItemUnits(orders, (l) => l.size),
    colours: groupItemUnits(orders, (l) => l.colour),
    legColours: groupItemUnits(orders, (l) => l.legColour),
    byHour,
    byWeekday,
  };
};

// ---------------------------------------------------------------- formatting

/** "18 Nov 2026, 1:30 PM" in Sri Lanka time. */
export const formatSlDateTime = (ms: number | null) => {
  if (ms === null) return '—';
  const d = new Date(ms + SL_OFFSET_MS);
  const h = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
};

export const formatSlDate = (ms: number | null) => {
  if (ms === null) return '—';
  const d = new Date(ms + SL_OFFSET_MS);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

/** "2026-11-15T17:00" for a datetime-local input, in Sri Lanka time. */
export const toSlInputValue = (ms: number) => new Date(ms + SL_OFFSET_MS).toISOString().slice(0, 16);

/** Parses a datetime-local value entered as Sri Lanka time. */
export const fromSlInputValue = (value: string): number | null => {
  if (!value) return null;
  const ms = Date.parse(`${value.slice(0, 16)}:00Z`);
  return isNaN(ms) ? null : ms - SL_OFFSET_MS;
};

export const daysBetween = (fromMs: number | null, toMs: number) =>
  fromMs === null ? null : Math.max(0, (toMs - fromMs) / DAY_MS);

export const formatHour = (h: number) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
