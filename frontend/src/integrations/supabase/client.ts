import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL =
  "https://ocflgbivqqoqdjpqgzkn.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jZmxnYml2cXFvcWRqcHFnemtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNTEzNDksImV4cCI6MjA5MjkyNzM0OX0.od0sjK_YPVCgkBvxeOLG1KHdlO8bi2z0wVtctBHAQ8g";

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);