// Order report bucketing for the Reports page.
//
// A business day runs 5:00 PM to 5:00 PM Sri Lanka time (UTC+5:30). The day is
// named after the date it ends on: an order entered at 6:00 PM on 17 Nov counts
// for 18 Nov. Weeks (Monday to Sunday), months and years are built from those
// business days, so they also start and end at 5:00 PM.

const SL_OFFSET_MS = 5.5 * 60 * 60 * 1000;
// Shifting Sri Lanka time forward 7 hours turns the 5:00 PM cut-off into midnight.
const CUTOFF_SHIFT_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type Granularity = 'day' | 'week' | 'month' | 'year';

export type OrderEventRow = {
  created_at: string | null;
  assigned_at: string | null;
  completed_at: string | null;
};

export type PeriodStats = {
  key: number;
  shortLabel: string;
  label: string;
  range: string;
  isCurrent: boolean;
  entered: number;
  delivered: number;
  completed: number;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Business day number (days since 1970-01-01) for a UTC timestamp in ms. */
export const businessDayOf = (utcMs: number) =>
  Math.floor((utcMs + SL_OFFSET_MS + CUTOFF_SHIFT_MS) / DAY_MS);

const dayDate = (day: number) => new Date(day * DAY_MS); // read with getUTC*

const mondayOf = (day: number) => day - ((dayDate(day).getUTCDay() + 6) % 7);

const monthKeyOf = (day: number) => {
  const d = dayDate(day);
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
};

const firstDayOfMonthKey = (monthKey: number) =>
  Math.round(Date.UTC(Math.floor(monthKey / 12), monthKey % 12, 1) / DAY_MS);

const periodKeyOf = (day: number, g: Granularity) => {
  switch (g) {
    case 'day': return day;
    case 'week': return mondayOf(day);
    case 'month': return monthKeyOf(day);
    case 'year': return dayDate(day).getUTCFullYear();
  }
};

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
      return {
        shortLabel: fmtDay(key),
        label: `${WEEKDAYS[d.getUTCDay()]} ${fmtDay(key, true)}`,
        range: fmtRange(key, key),
      };
    }
    case 'week': {
      const end = key + 6;
      return {
        shortLabel: fmtDay(key),
        label: `Week ${fmtDay(key)} – ${fmtDay(end, true)}`,
        range: fmtRange(key, end),
      };
    }
    case 'month': {
      const first = firstDayOfMonthKey(key);
      const last = firstDayOfMonthKey(key + 1) - 1;
      const name = `${MONTHS[key % 12]} ${Math.floor(key / 12)}`;
      return { shortLabel: name, label: name, range: fmtRange(first, last) };
    }
    case 'year': {
      const first = Math.round(Date.UTC(key, 0, 1) / DAY_MS);
      const last = Math.round(Date.UTC(key + 1, 0, 1) / DAY_MS) - 1;
      return { shortLabel: String(key), label: String(key), range: fmtRange(first, last, true) };
    }
  }
};

/** The key `steps` periods before `key`. */
const stepBack = (key: number, g: Granularity, steps: number) =>
  g === 'day' ? key - steps : g === 'week' ? key - 7 * steps : key - steps;

/**
 * Counts entered (created_at), delivered (assigned_at) and completed
 * (completed_at) orders for the last `count` periods, oldest first.
 * `count` null means every period back to the earliest order.
 */
export const buildPeriodStats = (
  rows: OrderEventRow[],
  g: Granularity,
  count: number | null,
  nowMs = Date.now(),
): PeriodStats[] => {
  const currentKey = periodKeyOf(businessDayOf(nowMs), g);

  const tallies = new Map<number, { entered: number; delivered: number; completed: number }>();
  let earliestKey = currentKey;
  const bump = (iso: string | null, field: 'entered' | 'delivered' | 'completed') => {
    if (!iso) return;
    const ms = Date.parse(iso);
    if (isNaN(ms)) return;
    const key = periodKeyOf(businessDayOf(ms), g);
    if (key < earliestKey) earliestKey = key;
    const t = tallies.get(key) ?? { entered: 0, delivered: 0, completed: 0 };
    t[field] += 1;
    tallies.set(key, t);
  };
  for (const r of rows) {
    bump(r.created_at, 'entered');
    bump(r.assigned_at, 'delivered');
    bump(r.completed_at, 'completed');
  }

  const keys: number[] = [];
  if (count === null) {
    for (let k = currentKey; k >= earliestKey; k = stepBack(k, g, 1)) keys.push(k);
  } else {
    for (let i = 0; i < count; i++) keys.push(stepBack(currentKey, g, i));
  }

  return keys.reverse().map((key) => {
    const t = tallies.get(key) ?? { entered: 0, delivered: 0, completed: 0 };
    return { key, ...describe(key, g), isCurrent: key === currentKey, ...t };
  });
};
