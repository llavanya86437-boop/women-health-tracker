import { Mic, MicOff, Volume2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MicBtnProps = {
  listening: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
  size?: "icon" | "sm";
  className?: string;
  label?: string;
};

export const MicButton = ({
  listening,
  onStart,
  onStop,
  disabled,
  size = "icon",
  className,
  label,
}: MicBtnProps) => (
  <Button
    type="button"
    size={size}
    variant={listening ? "default" : "outline"}
    disabled={disabled}
    onClick={listening ? onStop : onStart}
    aria-label={label ?? (listening ? "Stop recording" : "Start voice input")}
    className={cn(
      "rounded-2xl",
      size === "icon" ? "h-12 w-12 flex-shrink-0" : "",
      listening && "bg-gradient-primary text-primary-foreground animate-pulse",
      className
    )}
  >
    {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
  </Button>
);

type SpeakBtnProps = {
  speaking: boolean;
  onSpeak: () => void;
  onStop: () => void;
  disabled?: boolean;
  className?: string;
  label?: string;
};

export const SpeakButton = ({
  speaking,
  onSpeak,
  onStop,
  disabled,
  className,
  label,
}: SpeakBtnProps) => (
  <Button
    type="button"
    size="sm"
    variant="ghost"
    disabled={disabled}
    onClick={speaking ? onStop : onSpeak}
    aria-label={label ?? (speaking ? "Stop reading" : "Read aloud")}
    className={cn("h-8 gap-1.5 rounded-full", className)}
  >
    {speaking ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
    <span className="text-xs">{label ?? (speaking ? "Stop" : "Listen")}</span>
  </Button>
);
