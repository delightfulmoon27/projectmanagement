export function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

// ISO 8601 week number
export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export interface WeekColumn {
  start: Date;
  end: Date;
  weekNumber: number;
  isCurrent: boolean;
}

export function generateWeekColumns(weeksBefore = 4, weeksAfter = 20): WeekColumn[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentWeekStart = startOfWeekMonday(today);
  const firstWeekStart = addWeeks(currentWeekStart, -weeksBefore);

  const columns: WeekColumn[] = [];
  for (let i = 0; i <= weeksBefore + weeksAfter; i++) {
    const start = addWeeks(firstWeekStart, i);
    const end = addDays(start, 6);
    columns.push({
      start,
      end,
      weekNumber: getISOWeek(start),
      isCurrent: start.getTime() === currentWeekStart.getTime(),
    });
  }
  return columns;
}

export interface MonthGroup {
  label: string;
  weekCount: number;
}

export function groupWeeksByMonth(weeks: WeekColumn[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const week of weeks) {
    const label = week.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.weekCount++;
    } else {
      groups.push({ label, weekCount: 1 });
    }
  }
  return groups;
}

export function diffDays(from: Date, to: Date): number {
  const a = new Date(from);
  a.setHours(0, 0, 0, 0);
  const b = new Date(to);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}
