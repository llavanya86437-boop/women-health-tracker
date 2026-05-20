import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Flower2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/i18n/LanguageProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Auth() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { t } = useLang();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) navigate("/app", { replace: true });
  }, [session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: { display_name: name },
          },
        });
        if (error) throw error;
        toast.success("Welcome to Bloom 🌸");
        navigate("/app", { replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t.auth.welcome);
        navigate("/app", { replace: true });
      }
    } catch (err: any) {
      const raw = (err?.message ?? "").toLowerCase();
      let friendly = err?.message ?? t.common.error;
      if (raw.includes("rate limit") || raw.includes("over_email_send_rate_limit")) {
        friendly = "Too many sign-up attempts. Please wait a few minutes and try again.";
      } else if (raw.includes("invalid login") || raw.includes("invalid api") || raw.includes("invalid_credentials")) {
        friendly = "Incorrect email or password. Please double-check for typos (e.g. gmail.com vs gmai.lcom).";
      } else if (raw.includes("email not confirmed")) {
        friendly = "Please confirm your email address before signing in.";
      } else if (raw.includes("user already registered")) {
        friendly = "An account with this email already exists. Try signing in instead.";
      }
      toast.error(friendly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4 relative overflow-hidden">
      {/* decorative blobs */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-lavender/30 blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />

      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 rounded-3xl bg-gradient-primary items-center justify-center shadow-glow mb-4">
            <Flower2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-4xl font-semibold mb-2">{t.appName}</h1>
          <p className="text-muted-foreground">{t.tagline}</p>
        </div>

        <div className="bg-gradient-card backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-card">
          <h2 className="font-display text-2xl font-semibold mb-1">
            {mode === "signin" ? t.auth.welcome : t.auth.createAccount}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "signin" ? t.auth.signInSubtitle : t.auth.signUpSubtitle}
          </p>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">{t.auth.name}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="rounded-xl h-11 bg-background/60" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t.auth.email}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="rounded-xl h-11 bg-background/60" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t.auth.password}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="rounded-xl h-11 bg-background/60" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-gradient-primary hover:opacity-90 shadow-soft text-base font-medium">
              {loading ? t.common.loading : mode === "signin" ? t.auth.signIn : t.auth.signUp}
            </Button>
          </form>

          <div className="text-center mt-6 text-sm text-muted-foreground">
            {mode === "signin" ? t.auth.noAccount : t.auth.haveAccount}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-primary font-medium hover:underline"
            >
              {mode === "signin" ? t.auth.signUpLink : t.auth.signInLink}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
