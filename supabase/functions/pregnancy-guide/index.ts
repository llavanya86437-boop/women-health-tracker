// Edge function: returns AI-generated month-by-month guidance
// for pregnancy (months 1-9) or baby growth (months 0-24).
// Safety: educational only, never prescriptive; always end with disclaimer.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PREGNANCY_PROMPT = (month: number, lang: string) => `You are Bloom, a gentle pregnancy wellness companion.

The user is currently in **month ${month} of pregnancy** (months 1–9).

Provide a warm, structured response in ${lang === "kn" ? "Kannada" : "English"} with these EXACT markdown sections:

## 🌸 What's happening this month
2–3 sentences about baby development and common bodily changes.

## 🥗 Nutrition & lifestyle
3–4 short bullet points (foods to favour, hydration, rest, gentle movement).

## 💊 Common supplements & medications
List 2–4 commonly recommended items (e.g. folic acid, iron, calcium, prenatal vitamins). For EACH item write one short sentence explaining its general purpose.
**CRITICAL: Never give dosages. Always say "as prescribed by your doctor".**

## ⚠️ Warning signs — seek care immediately
3–4 bullet points of red-flag symptoms specific to this month.

## 🤍 Gentle reminder
One short, warm sentence of encouragement.

End with this exact line on its own paragraph:
"⚠️ This is general educational information, not medical advice. Always consult your obstetrician or healthcare provider before starting any medication or supplement."

STRICT RULES:
- Never diagnose. Never prescribe specific dosages. Never replace a doctor.
- Be concise, warm, non-judgmental.`;

const BABY_PROMPT = (month: number, lang: string) => `You are Bloom, a gentle infant care companion.

The user's baby is **${month} month${month === 1 ? "" : "s"} old** (range 0–24 months).

Provide a warm, structured response in ${lang === "kn" ? "Kannada" : "English"} with these EXACT markdown sections:

## 👶 Growth & development
2–3 sentences about typical physical, motor, and cognitive milestones at this age.

## 🍼 Feeding
3–4 short bullet points (breastfeeding/formula, introduction of solids if age-appropriate, hydration).

## 😴 Sleep
2–3 bullet points on typical sleep patterns and gentle sleep tips.

## 🧸 Play & bonding
2–3 short ideas for stimulation, tummy time, reading, or sensory play appropriate for this age.

## 💉 Health checkpoints
Mention common vaccinations or pediatric check-ups due around this age (general guidance only — say "follow your pediatrician's schedule").

## ⚠️ Warning signs — see a pediatrician
3–4 bullet points of red flags for this age (e.g. poor feeding, fever, missed milestones).

## 🤍 Gentle reminder
One short, warm sentence for the parent.

End with this exact line on its own paragraph:
"⚠️ This is general educational information, not medical advice. Always consult your pediatrician for your baby's specific care."

STRICT RULES:
- Never diagnose. Never recommend medications or dosages. Defer all medical decisions to a pediatrician.
- Be concise, warm, non-judgmental.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mode = body?.mode;
    const month = Number(body?.month);
    const lang = body?.lang === "kn" ? "kn" : "en";

    if (mode !== "pregnancy" && mode !== "baby") {
      return new Response(JSON.stringify({ error: "mode must be 'pregnancy' or 'baby'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Number.isInteger(month)) {
      return new Response(JSON.stringify({ error: "month must be an integer" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (mode === "pregnancy" && (month < 1 || month > 9)) {
      return new Response(JSON.stringify({ error: "Pregnancy month must be 1–9" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (mode === "baby" && (month < 0 || month > 24)) {
      return new Response(JSON.stringify({ error: "Baby month must be 0–24" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompt = mode === "pregnancy"
      ? PREGNANCY_PROMPT(month, lang)
      : BABY_PROMPT(month, lang);

    const userMsg = mode === "pregnancy"
      ? `Please share guidance for month ${month} of pregnancy.`
      : `Please share guidance for a baby that is ${month} month${month === 1 ? "" : "s"} old.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Lovable Cloud workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const txt = await response.text();
      console.error("AI gateway error", response.status, txt);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pregnancy-guide unhandled error", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
