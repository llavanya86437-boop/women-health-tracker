import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useLang } from "@/i18n/LanguageProvider";

type Slot = "breakfast" | "meal" | "exercise";

type Settings = {
  enabled: boolean;
  breakfast_time: string;
  meal_time: string;
  exercise_time: string;
  condition: string;
};

const slotLabel = (s: Slot, lang: "en" | "kn") =>
  lang === "kn"
    ? { breakfast: "ಬೆಳಗಿನ ಉಪಾಹಾರ", meal: "ಮಧ್ಯಾಹ್ನದ ಊಟ", exercise: "ವ್ಯಾಯಾಮ" }[s]
    : { breakfast: "Breakfast time 🌅", meal: "Meal time 🥗", exercise: "Movement time 🧘" }[s];

const parseHM = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return { h: h || 0, m: m || 0 };
};

// Returns ms until next occurrence of HH:MM today/tomorrow
const msUntilNext = (hm: { h: number; m: number }) => {
  const now = new Date();
  const next = new Date();
  next.setHours(hm.h, hm.m, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
};

const firedKey = (userId: string, slot: Slot) => {
  const today = new Date().toISOString().slice(0, 10);
  return `bloom-reminder:${userId}:${today}:${slot}`;
};

export const useReminderScheduler = () => {
  const { user } = useAuth();
  const { lang } = useLang();
  const timersRef = useRef<number[]>([]);
  const settingsRef = useRef<Settings | null>(null);
  const langRef = useRef(lang);

  useEffect(() => { langRef.current = lang; }, [lang]);

  const fireReminder = async (slot: Slot) => {
    const s = settingsRef.current;
    if (!s) return;
    const k = firedKey(user!.id, slot);
    if (localStorage.getItem(k)) return;
    localStorage.setItem(k, "1");

    const title = slotLabel(slot, langRef.current);
    const loadingId = toast.loading(title, {
      description: langRef.current === "kn" ? "ನಿಮ್ಮ ದೈನಂದಿನ ಸಲಹೆಯನ್ನು ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ..." : "Preparing your tip...",
    });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = "http://localhost:8000/ai/daily-tip";
      
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ slot, condition: s.condition, lang: langRef.current }),
      });
      
      if (!resp.ok) throw new Error("Failed to fetch tip");
      const data = await resp.json();
      
      toast.dismiss(loadingId);
      toast(title, {
        description: data?.content ?? "Take a gentle pause for yourself 💗",
        duration: 30000,
        action: {
          label: langRef.current === "kn" ? "ಧನ್ಯವಾದ" : "Got it",
          onClick: () => {},
        },
      });
    } catch (e) {
      toast.dismiss(loadingId);
      toast(title, {
        description: langRef.current === "kn"
          ? "ನಿಮ್ಮ ದೇಹವನ್ನು ಆಲಿಸಿ ಮತ್ತು ಕಾಳಜಿ ವಹಿಸಿ 💗"
          : "Take a moment to care for yourself today 💗",
      });
    }
  };

  const scheduleAll = (s: Settings) => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    if (!s.enabled || !user) return;

    const slots: Array<[Slot, string]> = [
      ["breakfast", s.breakfast_time],
      ["meal", s.meal_time],
      ["exercise", s.exercise_time],
    ];

    slots.forEach(([slot, time]) => {
      const hm = parseHM(time);
      // immediate catch-up: if scheduled time already passed today AND not fired, fire now
      const now = new Date();
      const target = new Date();
      target.setHours(hm.h, hm.m, 0, 0);
      if (target.getTime() <= now.getTime() && !localStorage.getItem(firedKey(user.id, slot))) {
        fireReminder(slot);
      }
      const delay = msUntilNext(hm);
      const id = window.setTimeout(function loop() {
        fireReminder(slot);
        // re-schedule for next day (24h)
        const nid = window.setTimeout(loop, 24 * 60 * 60 * 1000);
        timersRef.current.push(nid);
      }, delay);
      timersRef.current.push(id);
    });
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from("reminder_settings")
        .select("enabled, breakfast_time, meal_time, exercise_time, condition")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      settingsRef.current = data as Settings | null;
      if (data) scheduleAll(data as Settings);
    };
    load();

    // realtime: react when settings change in another tab/page
    const ch = supabase
      .channel(`reminder-settings-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reminder_settings", filter: `user_id=eq.${user.id}` }, (payload: any) => {
        const next = payload.new as Settings;
        settingsRef.current = next;
        scheduleAll(next);
      })
      .subscribe();

    return () => {
      cancelled = true;
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
};
