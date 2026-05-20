
CREATE TABLE public.reminder_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  breakfast_time time NOT NULL DEFAULT '08:00',
  meal_time time NOT NULL DEFAULT '13:00',
  exercise_time time NOT NULL DEFAULT '17:00',
  condition text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own reminder settings" ON public.reminder_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own reminder settings" ON public.reminder_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reminder settings" ON public.reminder_settings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own reminder settings" ON public.reminder_settings
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_reminder_settings_updated_at
  BEFORE UPDATE ON public.reminder_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
