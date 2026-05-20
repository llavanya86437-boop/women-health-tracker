import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarHeart,
  Sparkles,
  Leaf,
  Flower2,
  Heart,
} from "lucide-react";

import { useLang } from "@/i18n/LanguageProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { t, lang } = useLang();

  // DATABASE TEST
  const testDatabase = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert("Please login first.");
        return;
      }

      const {
        data: existingProfile,
        error: fetchError,
      } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError) {
        alert(fetchError.message);
        return;
      }

      if (existingProfile) {
        const { error: updateError } =
          await supabase
            .from("profiles")
            .update({
              display_name: "Updated User",
              preferred_language: "en",
              average_cycle_length: 28,
              average_period_length: 5,
            })
            .eq("user_id", user.id);

        if (updateError) {
          alert(updateError.message);
        } else {
          alert("Profile updated successfully!");
        }

        return;
      }

      const { error: insertError } =
        await supabase
          .from("profiles")
          .insert([
            {
              user_id: user.id,
              display_name: "Test User",
              preferred_language: "en",
              average_cycle_length: 28,
              average_period_length: 5,
            },
          ]);

      if (insertError) {
        alert(insertError.message);
      } else {
        alert("Profile created successfully!");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    }
  };

  const features = [
    {
      icon: CalendarHeart,
      title:
        lang === "en"
          ? "Cycle Tracking"
          : "ಚಕ್ರ ಟ್ರ್ಯಾಕಿಂಗ್",

      desc:
        lang === "en"
          ? "Log periods and predict your next cycle."
          : "ಋತುಚಕ್ರವನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ.",

      gradient: "bg-gradient-cream",
    },

    {
      icon: Sparkles,
      title:
        lang === "en"
          ? "AI Wellness"
          : "AI ಆರೋಗ್ಯ",

      desc:
        lang === "en"
          ? "Gentle wellness guidance."
          : "ಸೌಮ್ಯ ಆರೋಗ್ಯ ಮಾರ್ಗದರ್ಶನ.",

      gradient: "bg-gradient-lavender",
    },

    {
      icon: Leaf,
      title:
        lang === "en"
          ? "Daily Wellness"
          : "ದೈನಂದಿನ ಆರೋಗ್ಯ",

      desc:
        lang === "en"
          ? "Healthy routines for your cycle."
          : "ನಿಮ್ಮ ಆರೋಗ್ಯಕ್ಕಾಗಿ ದಿನಚರಿ.",

      gradient: "bg-gradient-card",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-hero relative overflow-hidden">
      {/* HEADER */}
      <header className="relative max-w-6xl mx-auto px-4 md:px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-soft">
            <Flower2 className="h-5 w-5 text-primary-foreground" />
          </div>

          <span className="font-display text-xl font-semibold">
            {t.appName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <LanguageToggle />

          <Button asChild size="sm">
            <Link to="/auth">
              {t.auth.signIn}
            </Link>
          </Button>
        </div>
      </header>

      {/* MAIN */}
      <main className="relative max-w-6xl mx-auto px-4 md:px-8">
        <section className="text-center pt-12 md:pt-24 pb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-soft text-primary text-xs font-medium mb-6">
            <Heart className="h-3 w-3" />

            {lang === "en"
              ? "Made with care, for you"
              : "ನಿಮಗಾಗಿ, ಕಾಳಜಿಯಿಂದ"}
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-semibold leading-[1.05] tracking-tight max-w-3xl mx-auto">
            {lang === "en"
              ? "Your gentle companion"
              : "ನಿಮ್ಮ ಆರೋಗ್ಯ ಸಂಗಾತಿ"}
          </h1>

          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
            {lang === "en"
              ? "Track your wellness journey privately."
              : "ನಿಮ್ಮ ಆರೋಗ್ಯವನ್ನು ಖಾಸಗಿವಾಗಿ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ."}
          </p>

          {/* BUTTONS */}
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Button asChild size="lg" className="gap-2">
              <Link to="/auth">
                {lang === "en"
                  ? "Start your journey"
                  : "ಪ್ರಾರಂಭಿಸಿ"}

                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <Button
              onClick={testDatabase}
              variant="outline"
            >
              Test Database
            </Button>
          </div>
        </section>

        {/* FEATURES */}
        <section className="grid md:grid-cols-3 gap-5 pb-24">
          {features.map(
            (feature, index) => {
              const Icon = feature.icon;

              return (
                <div
                  key={index}
                  className={`rounded-3xl p-7 border shadow-card ${feature.gradient}`}
                >
                  <div className="h-11 w-11 rounded-2xl bg-white flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>

                  <h3 className="font-display text-xl font-semibold mb-2">
                    {feature.title}
                  </h3>

                  <p className="text-sm text-foreground/70">
                    {feature.desc}
                  </p>
                </div>
              );
            }
          )}
        </section>
      </main>
    </div>
  );
};

export default Index;