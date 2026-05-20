import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSpeechToText, useTextToSpeech } from "@/hooks/useVoice";
import { MicButton, SpeakButton } from "@/components/VoiceControls";

type Msg = { role: "user" | "assistant"; content: string };

export default function Assistant() {
  const { user } = useAuth();
  const { t, lang } = useLang();

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const { listening, start: startMic, stop: stopMic } = useSpeechToText(
    lang,
    (text) => {
      setInput((prev) => (prev ? `${prev} ${text}` : text));
    }
  );

  const { speaking, speak, cancel: stopSpeak } = useTextToSpeech(lang);

  // Load chat history
  useEffect(() => {
    (async () => {
      if (!user) return;

      const { data } = await supabase
        .from("chat_messages")
        .select("role,content")
        .order("created_at", { ascending: true })
        .limit(100);

      if (data && data.length) setMessages(data as Msg[]);
    })();
  }, [user]);

  // Auto scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming || !user) return;

    setInput("");

    const userMsg: Msg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];

    setMessages(newMessages);
    setStreaming(true);

    await supabase.from("chat_messages").insert({
      user_id: user.id,
      role: "user",
      content: text,
    });

    try {
      // ✅ IMPORTANT FIXED BACKEND URL
      const url = "http://127.0.0.1:8000/ai/wellness-chat";

      const { data: { session } } = await supabase.auth.getSession();

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            session?.access_token ??
            import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
          }`,
        },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content:
              lang === "kn"
                ? m.content + " (Reply in Kannada / ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ)"
                : m.content,
          })),
        }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        console.error("Backend error:", err);
        toast.error("Assistant error");
        setMessages((m) => m.slice(0, -1));
        return;
      }

      const data = await resp.json();

      const reply = data?.content || "No response from AI";

      const assistantMsg: Msg = {
        role: "assistant",
        content: reply,
      };

      setMessages((m) => [...m, assistantMsg]);

      await supabase.from("chat_messages").insert({
        user_id: user.id,
        role: "assistant",
        content: reply,
      });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Error");
      setMessages((m) => m.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="space-y-4 h-[calc(100vh-9rem)] md:h-[calc(100vh-7rem)] flex flex-col">
      {/* HEADER */}
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-semibold flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-primary" />
          {t.assistant.title}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t.assistant.subtitle}
        </p>
      </div>

      {/* DISCLAIMER */}
      <div className="flex items-start gap-2 rounded-2xl bg-accent border border-accent-foreground/10 px-4 py-3 text-xs text-accent-foreground">
        <AlertCircle className="h-4 w-4 mt-0.5" />
        <span>{t.assistant.disclaimer}</span>
      </div>

      {/* CHAT BOX */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-3xl bg-gradient-card border p-4 md:p-6 space-y-4"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col gap-1",
              m.role === "user" ? "items-end" : "items-start"
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-3xl px-4 py-3 text-sm whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-black"
              )}
            >
              {m.content}
            </div>

            {m.role === "assistant" && (
              <SpeakButton
                speaking={speaking && i === messages.length - 1}
                onSpeak={() => speak(m.content)}
                onStop={stopSpeak}
              />
            )}
          </div>
        ))}

        {messages.length === 0 && (
          <p className="text-gray-500 text-sm">
            Start asking your wellness question...
          </p>
        )}
      </div>

      {/* INPUT BOX */}
      <div className="flex gap-2 items-end">
        <MicButton
          listening={listening}
          onStart={startMic}
          onStop={stopMic}
          disabled={streaming}
        />

        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={
            listening
              ? lang === "kn"
                ? "ಆಲಿಸಲಾಗುತ್ತಿದೆ..."
                : "Listening..."
              : "Ask your health question..."
          }
          className="rounded-2xl min-h-[48px]"
        />

        <Button
          onClick={send}
          disabled={streaming || !input.trim()}
          className="h-12 w-12 rounded-2xl"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}