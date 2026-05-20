import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/i18n/LanguageProvider";

export const LanguageToggle = () => {
  const { lang, setLang } = useLang();
  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-full gap-2 border-primary/30 bg-card/60 backdrop-blur hover:bg-primary-soft"
      onClick={() => setLang(lang === "en" ? "kn" : "en")}
    >
      <Languages className="h-4 w-4 text-primary" />
      <span className="font-medium">{lang === "en" ? "EN" : "ಕನ್ನಡ"}</span>
    </Button>
  );
};
