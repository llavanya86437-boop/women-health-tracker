import { useEffect, useMemo, useState } from "react";
import { addDays, addMonths, eachDayOfInterval, endOfMonth, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/i18n/LanguageProvider";
import { computeInsights, type CycleRow } from "@/lib/cycle";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SymptomLog = {
  id?: string;
  log_date: string;
  mood: string | null;
  flow: string | null;
  energy: number | null;
  pain_level: number | null;
};

export default function Tracker() {
  const { user } = useAuth();
  const { t } = useLang();
  const [cycles, setCycles] = useState<CycleRow[]>([]);
  const [month, setMonth] = useState(new Date());
  const [dialog, setDialog] = useState(false);
  const [start, setStart] = useState(format(new Date(), "yyyy-MM-dd"));
  const [end, setEnd] = useState("");
  const [todayLog, setTodayLog] = useState<SymptomLog>({
    log_date: format(new Date(), "yyyy-MM-dd"),
    mood: null,
    flow: null,
    energy: 3,
    pain_level: 1,
  });

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const load = async () => {
    if (!user) return;
    const [{ data: cs }, { data: log }] = await Promise.all([
      supabase.from("cycles").select("id,start_date,end_date").order("start_date", { ascending: false }),
      supabase.from("symptom_logs").select("*").eq("log_date", todayStr).maybeSingle(),
    ]);
    setCycles(cs ?? []);
    if (log) setTodayLog(log as SymptomLog);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const insights = useMemo(() => computeInsights(cycles), [cycles]);

  // build all period days from cycles
  const periodDays = useMemo(() => {
    const set = new Set<string>();
    cycles.forEach((c) => {
      const s = new Date(c.start_date + "T00:00:00");
      const e = c.end_date ? new Date(c.end_date + "T00:00:00") : addDays(s, 4);
      eachDayOfInterval({ start: s, end: e }).forEach((d) => set.add(format(d, "yyyy-MM-dd")));
    });
    return set;
  }, [cycles]);

  const predictedDays = useMemo(() => {
    const set = new Set<string>();
    if (insights.nextPeriod) {
      eachDayOfInterval({ start: insights.nextPeriod, end: addDays(insights.nextPeriod, 4) }).forEach((d) =>
        set.add(format(d, "yyyy-MM-dd"))
      );
    }
    return set;
  }, [insights.nextPeriod]);

  const fertileDays = useMemo(() => {
    const set = new Set<string>();
    if (insights.fertileStart && insights.fertileEnd) {
      eachDayOfInterval({ start: insights.fertileStart, end: insights.fertileEnd }).forEach((d) =>
        set.add(format(d, "yyyy-MM-dd"))
      );
    }
    return set;
  }, [insights.fertileStart, insights.fertileEnd]);

  const monthDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  });

  const savePeriod = async () => {
    if (!user) return;
    const { error } = await supabase.from("cycles").insert({ user_id: user.id, start_date: start, end_date: end || null });
    if (error) return toast.error(error.message);
    toast.success(t.common.success);
    setDialog(false);
    setEnd("");
    await load();
  };

  const deletePeriod = async (id: string) => {
    const { error } = await supabase.from("cycles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t.common.success);
    await load();
  };

  const saveLog = async () => {
    if (!user) return;
    const payload = { ...todayLog, user_id: user.id, log_date: todayStr };
    const { error } = await supabase.from("symptom_logs").upsert(payload, { onConflict: "user_id,log_date" });
    if (error) return toast.error(error.message);
    toast.success(t.common.success);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold">{t.tracker.title}</h1>
          <p className="text-muted-foreground mt-1">{t.tracker.subtitle}</p>
        </div>
        <Dialog open={dialog} onOpenChange={setDialog}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-gradient-primary shadow-soft gap-2">
              <Plus className="h-4 w-4" />
              {t.tracker.addPeriod}
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle className="font-display">{t.tracker.addPeriod}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t.tracker.startDate}</Label>
                <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>{t.tracker.endDate}</Label>
                <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-xl" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDialog(false)}>{t.tracker.cancel}</Button>
              <Button onClick={savePeriod} className="bg-gradient-primary">{t.tracker.save}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendar */}
      <div className="rounded-3xl bg-gradient-card border border-border/50 p-6 shadow-card backdrop-blur">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, -1))} className="rounded-full">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-display text-xl font-semibold">{format(month, "MMMM yyyy")}</h3>
          <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))} className="rounded-full">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
          {["S","M","T","W","T","F","S"].map((d, i) => <div key={i} className="py-1 font-medium">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {monthDays.map((d) => {
            const ds = format(d, "yyyy-MM-dd");
            const inMonth = isSameMonth(d, month);
            const isPeriod = periodDays.has(ds);
            const isPredicted = !isPeriod && predictedDays.has(ds);
            const isFertile = !isPeriod && !isPredicted && fertileDays.has(ds);
            const isOvulation = insights.ovulationDate && isSameDay(d, insights.ovulationDate);
            const isToday = isSameDay(d, today);
            return (
              <button
                key={ds}
                className={cn(
                  "aspect-square rounded-xl text-sm font-medium transition-smooth relative flex items-center justify-center",
                  !inMonth && "opacity-30",
                  isPeriod && "bg-gradient-primary text-primary-foreground shadow-soft",
                  isPredicted && "bg-primary-soft text-primary border border-primary/30 border-dashed",
                  isFertile && "bg-lavender-soft text-foreground/80",
                  isOvulation && "ring-2 ring-lavender",
                  isToday && !isPeriod && !isPredicted && "ring-2 ring-foreground/30",
                  !isPeriod && !isPredicted && !isFertile && "hover:bg-muted",
                )}
              >
                {format(d, "d")}
              </button>
            );
          })}
        </div>

        {/* legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-md bg-gradient-primary" />{t.tracker.legend.period}</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-md bg-primary-soft border border-primary/30 border-dashed" />{t.tracker.legend.predicted}</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-md bg-lavender-soft" />{t.tracker.legend.fertile}</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-md ring-2 ring-lavender" />{t.tracker.legend.ovulation}</span>
        </div>
      </div>

      {/* Today's log */}
      <div className="rounded-3xl bg-gradient-card border border-border/50 p-6 shadow-card backdrop-blur">
        <h3 className="font-display text-xl font-semibold mb-4">{t.tracker.todayLog}</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>{t.tracker.mood}</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(t.tracker.moods) as Array<keyof typeof t.tracker.moods>).map((m) => (
                <button
                  key={m}
                  onClick={() => setTodayLog({ ...todayLog, mood: m })}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm border transition-smooth",
                    todayLog.mood === m ? "bg-gradient-primary text-primary-foreground border-transparent shadow-soft" : "border-border bg-background/60 hover:bg-primary-soft"
                  )}
                >
                  {t.tracker.moods[m]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t.tracker.flow}</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(t.tracker.flows) as Array<keyof typeof t.tracker.flows>).map((f) => (
                <button
                  key={f}
                  onClick={() => setTodayLog({ ...todayLog, flow: f })}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm border transition-smooth",
                    todayLog.flow === f ? "bg-gradient-primary text-primary-foreground border-transparent shadow-soft" : "border-border bg-background/60 hover:bg-primary-soft"
                  )}
                >
                  {t.tracker.flows[f]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <Label>{t.tracker.energy}: {todayLog.energy}</Label>
            <Slider min={1} max={5} step={1} value={[todayLog.energy ?? 3]} onValueChange={(v) => setTodayLog({ ...todayLog, energy: v[0] })} />
          </div>
          <div className="space-y-3">
            <Label>{t.tracker.pain}: {todayLog.pain_level}</Label>
            <Slider min={0} max={5} step={1} value={[todayLog.pain_level ?? 0]} onValueChange={(v) => setTodayLog({ ...todayLog, pain_level: v[0] })} />
          </div>
        </div>
        <Button onClick={saveLog} className="mt-6 rounded-full bg-gradient-primary shadow-soft">
          {t.tracker.saveLog}
        </Button>
      </div>

      {/* History */}
      {cycles.length > 0 && (
        <div className="rounded-3xl bg-gradient-card border border-border/50 p-6 shadow-card backdrop-blur">
          <h3 className="font-display text-xl font-semibold mb-4">{t.tracker.history}</h3>
          <div className="space-y-2">
            {cycles.slice(0, 6).map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-2xl bg-background/60 border border-border/40">
                <div>
                  <p className="font-medium">{format(new Date(c.start_date + "T00:00:00"), "MMM d, yyyy")}</p>
                  {c.end_date && (
                    <p className="text-xs text-muted-foreground">→ {format(new Date(c.end_date + "T00:00:00"), "MMM d")}</p>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => deletePeriod(c.id)} className="rounded-full">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
