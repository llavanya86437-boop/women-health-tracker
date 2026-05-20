-- Pregnancy profiles table
CREATE TABLE public.pregnancy_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'not_pregnant',
  due_date DATE,
  baby_birth_date DATE,
  baby_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT pregnancy_status_check CHECK (status IN ('not_pregnant', 'pregnant', 'has_baby'))
);

ALTER TABLE public.pregnancy_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own pregnancy profile"
  ON public.pregnancy_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own pregnancy profile"
  ON public.pregnancy_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own pregnancy profile"
  ON public.pregnancy_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own pregnancy profile"
  ON public.pregnancy_profiles FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_pregnancy_profiles_updated_at
  BEFORE UPDATE ON public.pregnancy_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();