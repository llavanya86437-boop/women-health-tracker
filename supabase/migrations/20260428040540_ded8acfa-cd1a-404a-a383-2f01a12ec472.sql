-- 1. Restrict DELETE on profiles: only owner can delete their profile
CREATE POLICY "Users delete own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 2. Realtime authorization: only allow users to subscribe to their own reminder_settings changes
-- Enable RLS on realtime.messages (if not already)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to receive realtime broadcasts only for topics they own
CREATE POLICY "Authenticated users read own reminder topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'reminder-settings-' || auth.uid()::text
);

-- 3. Lock down SECURITY DEFINER functions
-- handle_new_user is a trigger function attached to auth.users; revoke direct EXECUTE
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- update_updated_at_column is a trigger helper; revoke direct EXECUTE
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;