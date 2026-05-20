import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Droplet, Heart, Sparkles, Activity, Leaf, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/i18n/LanguageProvider";
import { computeInsights, fmtDate, type CycleRow } from "@/lib/cycle";

const StatCard = ({
  icon: Icon,
  label,
  value,
  hint,
  gradient,
}: {
  icon: any;
  label: string;
  value: string;
  hint?: string;
  gradient: string;
}) => (
  <div className={`relative overflow-hidden rounded-3xl p-5 shadow-card border border-white/40 ${gradient}`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs uppercase tracking-wider text-foreground/60 font-medium">{label}</p>
        <p className="font-display text-3xl font-semibold mt-1">{value}</p>
        {hint && <p className="text-xs text-foreground/60 mt-1">{hint}</p>}
      </div>
      <div className="h-10 w-10 rounded-2xl bg-white/60 backdrop-blur flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [cycles, setCycles] = useState<CycleRow[]>([]);
  const [name, setName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: cs }, { data: p }] = await Promise.all([
        supabase.from("cycles").select("id,start_date,end_date").order("start_date", { ascending: false }),
        supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
      ]);
      setCycles(cs ?? []);
      setName(p?.display_name ?? "");
      setLoading(false);
    })();
  }, [user]);

  const insights = computeInsights(cycles);
  const phaseLabel = insights.phase
    ? t.dashboard[`phase${insights.phase[0].toUpperCase()}${insights.phase.slice(1)}` as keyof typeof t.dashboard]
    : "—";

  const insightTexts: string[] = [];
  if (!cycles.length) {
    insightTexts.push(t.dashboard.noData);
  } else {
    if (insights.phase === "menstrual") insightTexts.push(lang === "en" ? "Be gentle with yourself today — rest and warm fluids can help." : "ಇಂದು ನಿಮ್ಮೊಂದಿಗೆ ಮೃದುವಾಗಿರಿ — ವಿಶ್ರಾಂತಿ ಮತ್ತು ಬೆಚ್ಚಗಿನ ದ್ರವಗಳು ಸಹಾಯ ಮಾಡಬಹುದು.");
    if (insights.phase === "follicular") insightTexts.push(lang === "en" ? "Energy is rising — a great time for movement and creative work." : "ಶಕ್ತಿ ಹೆಚ್ಚುತ್ತಿದೆ — ಚಲನೆ ಮತ್ತು ಸೃಜನಶೀಲ ಕೆಲಸಕ್ಕೆ ಒಳ್ಳೆಯ ಸಮಯ.");
    if (insights.phase === "ovulation") insightTexts.push(lang === "en" ? "You may feel your most social and energetic now." : "ನೀವು ಈಗ ಹೆಚ್ಚು ಸಾಮಾಜಿಕ ಮತ್ತು ಚೈತನ್ಯಶೀಲರಾಗಿರಬಹುದು.");
    if (insights.phase === "luteal") insightTexts.push(lang === "en" ? "Slow down and prioritise sleep — your body is preparing." : "ನಿಧಾನವಾಗಿ ಮತ್ತು ನಿದ್ರೆಗೆ ಆದ್ಯತೆ ನೀಡಿ — ನಿಮ್ಮ ದೇಹ ಸಿದ್ಧವಾಗುತ್ತಿದೆ.");
    if (insights.daysUntilNext !== null && insights.daysUntilNext <= 3 && insights.daysUntilNext >= 0)
      insightTexts.push(lang === "en" ? `Your period may start in about ${insights.daysUntilNext} day(s).` : `ನಿಮ್ಮ ಋತುಸ್ರಾವ ಸುಮಾರು ${insights.daysUntilNext} ದಿನಗಳಲ್ಲಿ ಪ್ರಾರಂಭವಾಗಬಹುದು.`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-semibold">
          {t.dashboard.hello}, {name || "💕"}
        </h1>
        <p className="text-muted-foreground mt-1">{t.dashboard.subtitle}</p>
      </div>

      {/* Hero cycle card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-8 text-primary-foreground shadow-glow">
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-white/10 blur-3xl translate-y-1/2 -translate-x-1/4" />
        <div className="relative">
          <p className="uppercase tracking-widest text-xs opacity-80">{t.dashboard.nextPeriod}</p>
          <p className="font-display text-5xl md:text-6xl font-semibold mt-2">
            {insights.nextPeriod ? fmtDate(insights.nextPeriod) : "—"}
          </p>
          {insights.daysUntilNext !== null && (
            <p className="text-sm opacity-90 mt-2">
              {insights.daysUntilNext >= 0
                ? `${t.dashboard.in} ${insights.daysUntilNext} ${t.dashboard.days}`
                : `${Math.abs(insights.daysUntilNext)} ${t.dashboard.days} ${lang === "en" ? "ago" : "ಹಿಂದೆ"}`}
            </p>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Calendar} label={t.dashboard.cycleDay} value={insights.cycleDay?.toString() ?? "—"} gradient="bg-gradient-cream" />
        <StatCard icon={Heart} label={t.dashboard.phase} value={String(phaseLabel)} gradient="bg-gradient-lavender" />
        <StatCard icon={Activity} label={t.dashboard.avgCycle} value={`${insights.avgCycle} ${t.dashboard.days}`} gradient="bg-gradient-card" />
      </div>

      {/* Insights */}
      <div className="rounded-3xl bg-gradient-card border border-border/50 p-6 shadow-card backdrop-blur">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-semibold">{t.dashboard.insights}</h2>
        </div>
        <ul className="space-y-3">
          {insightTexts.map((txt, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="mt-1 h-2 w-2 rounded-full bg-gradient-primary flex-shrink-0" />
              <span className="text-foreground/80">{txt}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link to="/app/tracker" className="group rounded-3xl bg-gradient-cream p-6 shadow-card border border-white/40 transition-smooth hover:shadow-glow">
          <Droplet className="h-6 w-6 text-primary mb-3" />
          <p className="font-display text-lg font-semibold">{t.dashboard.logToday}</p>
          <ArrowRight className="h-4 w-4 mt-2 text-primary group-hover:translate-x-1 transition-smooth" />
        </Link>
        <Link to="/app/wellness" className="group rounded-3xl bg-gradient-lavender p-6 shadow-card border border-white/40 transition-smooth hover:shadow-glow">
          <Leaf className="h-6 w-6 text-primary mb-3" />
          <p className="font-display text-lg font-semibold">{t.wellness.title}</p>
          <ArrowRight className="h-4 w-4 mt-2 text-primary group-hover:translate-x-1 transition-smooth" />
        </Link>
      </div>
    </div>
  );
}
