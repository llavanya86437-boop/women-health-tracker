import { Apple, Activity, Brain, Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useLang } from "@/i18n/LanguageProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSpeechToText } from "@/hooks/useVoice";
import { MicButton } from "@/components/VoiceControls";

const emptyHints = {
  en: "Search a condition above to see personalized suggestions here.",
  kn: "ವೈಯಕ್ತಿಕ ಸಲಹೆಗಳನ್ನು ನೋಡಲು ಮೇಲೆ ಸ್ಥಿತಿಯನ್ನು ಹುಡುಕಿ.",
} as const;

const sections = [
  { key: "diet", icon: Apple, gradient: "bg-gradient-cream" },
  { key: "exercise", icon: Activity, gradient: "bg-gradient-lavender" },
  { key: "mental", icon: Brain, gradient: "bg-gradient-card" },
] as const;

// ---------------- SECTION PARSER ----------------
function extractSection(md: string, keywords: string[]) {
  if (!md) return { bullets: [], raw: "" };

  const lines = md.split(/\r?\n/);
  let inSection = false;
  const sectionLines: string[] = [];

  for (const line of lines) {
    const heading = /^#{1,6}\s+(.*)$/.exec(line.trim());

    if (heading) {
      inSection = keywords.some((k) =>
        heading[1].toLowerCase().includes(k.toLowerCase())
      );
      continue;
    }

    if (inSection) sectionLines.push(line.trim());
  }

  const raw = sectionLines.join("\n").trim();

  const bullets = sectionLines
    .map((l) => /^\s*[-*•]\s+(.+)$/.exec(l)?.[1])
    .filter(Boolean) as string[];

  return { bullets, raw };
}

// ---------------- MAIN COMPONENT ----------------
export default function Wellness() {
  const { t, lang } = useLang();
  const c = (t.wellness as any).condition;

  const [condition, setCondition] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const { listening, start: startMic, stop: stopMic } = useSpeechToText(
    lang,
    setCondition
  );

  // ---------------- AI SECTIONS ----------------
  const aiSections = {
    diet: extractSection(result, ["diet", "nutrition", "ಆಹಾರ", "ಪೋಷಣೆ"]),
    exercise: extractSection(result, ["exercise", "movement", "ವ್ಯಾಯಾಮ", "ಚಲನೆ"]),
    mental: extractSection(result, ["mental", "wellbeing", "ಮಾನಸಿಕ"]),
  };

  // ---------------- FASTAPI CALL (FIXED) ----------------
  const handleSubmit = async (valueOverride?: string) => {
    const value = (valueOverride ?? condition).trim();

    if (!value) {
      toast.error(c.errors.required);
      return;
    }

    setLoading(true);
    setResult("");

    try {
      const resp = await fetch(
        "http://127.0.0.1:8000/ai/wellness-chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [
              {
                content: value,
              },
            ],
          }),
        }
      );

      const json = await resp.json();

      if (!resp.ok) {
        toast.error(json?.content || c.errors.generic);
        return;
      }

      // SAFE OUTPUT (same format as AI Assistant)
      setResult(json?.content ?? "");
    } catch (e: any) {
      toast.error(e.message || c.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- UI ----------------
  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-semibold flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-primary" />
          {t.wellness.title}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t.wellness.subtitle}
        </p>
      </div>

      {/* INPUT */}
      <section className="p-6 rounded-3xl border bg-gradient-lavender space-y-4">

        <div className="flex gap-2">

          <MicButton
            listening={listening}
            onStart={startMic}
            onStop={stopMic}
          />

          <Input
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            placeholder={c.placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) handleSubmit();
            }}
          />

          <Button onClick={() => handleSubmit()} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                {c.thinking}
              </>
            ) : (
              c.getRecommendations
            )}
          </Button>

        </div>

      </section>

      {/* OUTPUT */}
      {sections.map(({ key, icon: Icon, gradient }) => {
        const section = aiSections[key];
        const hasContent =
          section.bullets.length > 0 || section.raw.length > 0;

        return (
          <section key={key} className="space-y-3">

            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">
                {t.wellness.categories[key]}
              </h2>
            </div>

            {hasContent ? (
              <div className={`p-5 rounded-2xl border ${gradient}`}>
                {section.bullets.length > 0 ? (
                  <ul className="space-y-2">
                    {section.bullets.map((b, i) => (
                      <li key={i}>• {b}</li>
                    ))}
                  </ul>
                ) : (
                  <ReactMarkdown>{section.raw}</ReactMarkdown>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {emptyHints[lang]}
              </p>
            )}

          </section>
        );
      })}

    </div>
  );
}