import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/i18n/LanguageProvider";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Form = {
  enabled: boolean;
  breakfast_time: string;
  meal_time: string;
  exercise_time: string;
  condition: string;
};

const DEFAULTS: Form = {
  enabled: false,
  breakfast_time: "08:00",
  meal_time: "13:00",
  exercise_time: "17:00",
  condition: "general",
};

const Reminders = () => {
  const { user } = useAuth();
  const { lang } = useLang();
  const [form, setForm] = useState<Form>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const tr = (en: string, kn: string) => (lang === "kn" ? kn : en);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("reminder_settings")
        .select("enabled, breakfast_time, meal_time, exercise_time, condition")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setForm({
          enabled: data.enabled,
          breakfast_time: data.breakfast_time?.slice(0, 5) ?? "08:00",
          meal_time: data.meal_time?.slice(0, 5) ?? "13:00",
          exercise_time: data.exercise_time?.slice(0, 5) ?? "17:00",
          condition: data.condition ?? "general",
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("reminder_settings")
      .upsert({ user_id: user.id, ...form }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error(tr("Could not save", "ಉಳಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ"));
      return;
    }
    toast.success(
      form.enabled
        ? tr("Daily reminders are on 💗", "ದೈನಂದಿನ ಜ್ಞಾಪನೆಗಳು ಸಕ್ರಿಯವಾಗಿವೆ 💗")
        : tr("Reminders turned off", "ಜ್ಞಾಪನೆಗಳು ಆಫ್ ಆಗಿವೆ"),
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-soft">
            <Bell className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-semibold">
            {tr("Daily Reminders", "ದೈನಂದಿನ ಜ್ಞಾಪನೆಗಳು")}
          </h1>
        </div>
        <p className="text-muted-foreground">
          {tr(
            "Get gentle, AI-personalized nudges for breakfast, meals and movement — tailored to your health condition.",
            "ನಿಮ್ಮ ಆರೋಗ್ಯ ಸ್ಥಿತಿಗೆ ಅನುಗುಣವಾಗಿ ಬೆಳಗಿನ ಉಪಾಹಾರ, ಊಟ ಮತ್ತು ವ್ಯಾಯಾಮಕ್ಕಾಗಿ ಸೌಮ್ಯ AI ಜ್ಞಾಪನೆಗಳು.",
          )}
        </p>
      </header>

      <Card className="p-6 space-y-6 border-border/60">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-base">{tr("Enable daily reminders", "ದೈನಂದಿನ ಜ್ಞಾಪನೆಗಳನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿ")}</Label>
            <p className="text-sm text-muted-foreground mt-1">
              {tr("Three caring nudges every day at the times you choose.", "ನೀವು ಆಯ್ಕೆ ಮಾಡಿದ ಸಮಯದಲ್ಲಿ ದಿನಕ್ಕೆ ಮೂರು ಜ್ಞಾಪನೆಗಳು.")}
            </p>
          </div>
          <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
        </div>

        <div className="space-y-2">
          <Label>{tr("Health context (for personalization)", "ಆರೋಗ್ಯ ಸಂದರ್ಭ")}</Label>
          <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="general">{tr("General wellness", "ಸಾಮಾನ್ಯ ಆರೋಗ್ಯ")}</SelectItem>
              <SelectItem value="PCOD">PCOD</SelectItem>
              <SelectItem value="PCOS">PCOS</SelectItem>
              <SelectItem value="pregnant">{tr("Pregnant", "ಗರ್ಭಿಣಿ")}</SelectItem>
              <SelectItem value="postpartum">{tr("Postpartum", "ಪ್ರಸವಾನಂತರ")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>🌅 {tr("Breakfast", "ಬೆಳಗಿನ ಉಪಾಹಾರ")}</Label>
            <Input type="time" value={form.breakfast_time} onChange={(e) => setForm({ ...form, breakfast_time: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>🥗 {tr("Meal", "ಊಟ")}</Label>
            <Input type="time" value={form.meal_time} onChange={(e) => setForm({ ...form, meal_time: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>🧘 {tr("Exercise", "ವ್ಯಾಯಾಮ")}</Label>
            <Input type="time" value={form.exercise_time} onChange={(e) => setForm({ ...form, exercise_time: e.target.value })} />
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="w-full sm:w-auto rounded-full gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {tr("Save preferences", "ಉಳಿಸಿ")}
        </Button>

        <p className="text-xs text-muted-foreground border-t border-border/60 pt-4">
          {tr(
            "Reminders appear as in-app notifications while Bloom is open in your browser. Each one includes a fresh AI-generated tip and asks how you're doing.",
            "ಬ್ಲೂಮ್ ತೆರೆದಿರುವಾಗ ಜ್ಞಾಪನೆಗಳು ಆಪ್‌ನಲ್ಲಿ ಕಾಣಿಸಿಕೊಳ್ಳುತ್ತವೆ.",
          )}
        </p>
      </Card>
    </div>
  );
};

export default Reminders;
