// Free browser-based voice helpers using the Web Speech API.
// - Speech-to-text via window.SpeechRecognition / webkitSpeechRecognition
// - Text-to-speech via window.speechSynthesis
// Supports English (en-US) and Kannada (kn-IN).
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Lang = "en" | "kn";

const localeFor = (lang: Lang) => (lang === "kn" ? "kn-IN" : "en-US");

const cleanForSpeech = (text: string) =>
  text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/[#>*_~\-]+/g, " ")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

export const isSpeechRecognitionSupported = () => {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );
};

export const isSpeechSynthesisSupported = () => {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window;
};

// Request mic permission once so the browser shows the prompt before SR starts.
async function ensureMicPermission(lang: Lang): Promise<boolean> {
  try {
    if (!navigator.mediaDevices?.getUserMedia) return true; // let SR try anyway
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Immediately stop — we only needed the permission grant.
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch (e: any) {
    console.error("Mic permission error:", e);
    toast.error(
      lang === "kn"
        ? "ಮೈಕ್ರೋಫೋನ್ ಪ್ರವೇಶ ಬೇಕಾಗಿದೆ. ಬ್ರೌಸರ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳಲ್ಲಿ ಅನುಮತಿಸಿ."
        : "Microphone access required. Please allow it in your browser."
    );
    return false;
  }
}

export function useSpeechToText(lang: Lang, onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(onResult);
  const finalTextRef = useRef("");
  const manualStopRef = useRef(false);
  const shouldRestartRef = useRef(false);

  // Keep latest callback without restarting recognition.
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const stop = useCallback(() => {
    manualStopRef.current = true;
    shouldRestartRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  const start = useCallback(async () => {
    if (!isSpeechRecognitionSupported()) {
      toast.error(
        lang === "kn"
          ? "ಬ್ರೌಸರ್ ಧ್ವನಿ ಬೆಂಬಲಿಸುವುದಿಲ್ಲ. Chrome ಬಳಸಿ."
          : "Voice input not supported. Please use Chrome or Edge."
      );
      return;
    }

    // Some browsers require HTTPS for mic. Warn early.
    if (
      typeof window !== "undefined" &&
      window.location.protocol !== "https:" &&
      window.location.hostname !== "localhost"
    ) {
      toast.error("Voice input requires HTTPS.");
      return;
    }

    const ok = await ensureMicPermission(lang);
    if (!ok) return;

    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = localeFor(lang);
    recognition.interimResults = true;
    recognition.continuous = true; // keep mic open until user stops
    recognition.maxAlternatives = 1;
    finalTextRef.current = "";
    manualStopRef.current = false;
    shouldRestartRef.current = true;

    recognition.onstart = () => {
      console.log("[voice] recognition started", recognition.lang);
      setListening(true);
    };
    recognition.onresult = (event: any) => {
      let finalText = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = res[0]?.transcript ?? "";
        if (res.isFinal) finalText += transcript;
        else interim += transcript;
      }
      console.log("[voice] result", { finalText, interim });
      if (finalText) finalTextRef.current += finalText;
    };
    recognition.onerror = (event: any) => {
      const code = event?.error;
      console.error("[voice] error", code, event?.message);
      if (code === "not-allowed" || code === "service-not-allowed") {
        toast.error(
          lang === "kn"
            ? "ಮೈಕ್ರೋಫೋನ್ ಪ್ರವೇಶ ನಿರಾಕರಿಸಲಾಗಿದೆ."
            : "Microphone access denied."
        );
        shouldRestartRef.current = false;
        setListening(false);
      } else if (code === "no-speech" || code === "aborted") {
        // Don't toast — just let onend auto-restart so user can keep talking.
        return;
      } else if (code === "audio-capture") {
        toast.error(
          lang === "kn"
            ? "ಮೈಕ್ರೋಫೋನ್ ಸಿಗಲಿಲ್ಲ. ಸಾಧನ ಪರಿಶೀಲಿಸಿ."
            : "No microphone detected. Check your device."
        );
        shouldRestartRef.current = false;
        setListening(false);
      } else if (code === "language-not-supported") {
        toast.error(
          lang === "kn"
            ? "ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಕನ್ನಡ ಧ್ವನಿ ಬೆಂಬಲಿಸುವುದಿಲ್ಲ. Chrome ಬಳಸಿ."
            : "Language not supported in this browser."
        );
        shouldRestartRef.current = false;
        setListening(false);
      } else {
        toast.error(`Voice error: ${code ?? "unknown"}`);
        shouldRestartRef.current = false;
        setListening(false);
      }
    };
    recognition.onend = () => {
      console.log("[voice] ended, final:", finalTextRef.current, "manualStop:", manualStopRef.current);
      // Auto-restart if user hasn't manually stopped and no fatal error.
      if (shouldRestartRef.current && !manualStopRef.current) {
        try {
          recognition.start();
          return;
        } catch (e) {
          console.warn("[voice] restart failed", e);
        }
      }
      setListening(false);
      const text = finalTextRef.current.trim();
      if (text) onResultRef.current(text);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error("[voice] start threw", e);
      setListening(false);
    }
  }, [lang]);

  useEffect(() => () => stop(), [stop]);

  return { listening, start, stop, supported: isSpeechRecognitionSupported() };
}

export function useTextToSpeech(lang: Lang) {
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const cancel = useCallback(() => {
    if (!isSpeechSynthesisSupported()) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!isSpeechSynthesisSupported()) {
        toast.error(
          lang === "kn"
            ? "ಬ್ರೌಸರ್ ಧ್ವನಿ ಔಟ್‌ಪುಟ್ ಬೆಂಬಲಿಸುವುದಿಲ್ಲ."
            : "Voice output not supported."
        );
        return;
      }
      const cleaned = cleanForSpeech(text);
      if (!cleaned) return;

      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(cleaned);
      u.lang = localeFor(lang);

      const voices = window.speechSynthesis.getVoices();
      const match =
        voices.find((v) => v.lang?.toLowerCase() === u.lang.toLowerCase()) ||
        voices.find((v) => v.lang?.toLowerCase().startsWith(lang));
      if (match) u.voice = match;

      u.rate = 1;
      u.pitch = 1;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      utterRef.current = u;
      setSpeaking(true);
      window.speechSynthesis.speak(u);
    },
    [lang]
  );

  useEffect(() => {
    if (!isSpeechSynthesisSupported()) return;
    const handler = () => window.speechSynthesis.getVoices();
    handler();
    window.speechSynthesis.addEventListener?.("voiceschanged", handler);
    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", handler);
      window.speechSynthesis.cancel();
    };
  }, []);

  return { speaking, speak, cancel, supported: isSpeechSynthesisSupported() };
}
