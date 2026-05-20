import { addDays, differenceInDays, format, isSameDay } from "date-fns";

export type CycleRow = { id: string; start_date: string; end_date: string | null };

export type CycleInsights = {
  lastStart: Date | null;
  nextPeriod: Date | null;
  daysUntilNext: number | null;
  cycleDay: number | null;
  ovulationDate: Date | null;
  fertileStart: Date | null;
  fertileEnd: Date | null;
  phase: "menstrual" | "follicular" | "ovulation" | "luteal" | null;
  avgCycle: number;
};

export const computeInsights = (
  cycles: CycleRow[],
  defaultCycleLen = 28,
  defaultPeriodLen = 5,
  today = new Date()
): CycleInsights => {
  if (!cycles.length) {
    return {
      lastStart: null,
      nextPeriod: null,
      daysUntilNext: null,
      cycleDay: null,
      ovulationDate: null,
      fertileStart: null,
      fertileEnd: null,
      phase: null,
      avgCycle: defaultCycleLen,
    };
  }
  const sorted = [...cycles].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const starts = sorted.map((c) => new Date(c.start_date + "T00:00:00"));
  const diffs: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    diffs.push(differenceInDays(starts[i], starts[i - 1]));
  }
  const avg = diffs.length ? Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length) : defaultCycleLen;
  const lastStart = starts[starts.length - 1];
  const nextPeriod = addDays(lastStart, avg);
  const daysUntilNext = differenceInDays(nextPeriod, today);
  const cycleDay = differenceInDays(today, lastStart) + 1;
  const ovulationDate = addDays(lastStart, avg - 14);
  const fertileStart = addDays(ovulationDate, -5);
  const fertileEnd = addDays(ovulationDate, 1);

  let phase: CycleInsights["phase"] = "luteal";
  if (cycleDay <= defaultPeriodLen) phase = "menstrual";
  else if (today >= fertileStart && today <= fertileEnd) phase = isSameDay(today, ovulationDate) ? "ovulation" : "follicular";
  else if (today < fertileStart) phase = "follicular";

  return { lastStart, nextPeriod, daysUntilNext, cycleDay, ovulationDate, fertileStart, fertileEnd, phase, avgCycle: avg };
};

export const fmtDate = (d: Date | null) => (d ? format(d, "MMM d") : "—");
