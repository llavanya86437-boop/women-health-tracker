// Edge function: returns AI-generated personalized wellness recommendations
// based on a user-entered health condition.
// Safety: educational only, never prescriptive; always end with disclaimer.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_CONDITION_LENGTH = 200;

const buildPrompt = (condition: string, lang: string) => `You are Bloom, a gentle women's wellness companion.

The user has shared this health concern / condition: "${condition}"

Provide a warm, structured response in ${lang === "kn" ? "Kannada" : "English"} with these EXACT markdown sections:

## 🌸 Understanding "${condition}"
2–3 sentences of gentle, general information about this condition (no diagnosis, no prognosis).

## 🥗 Diet & Nutrition
4–5 short bullet points: foods to favour, foods to limit, hydration tips — tailored to this condition.

## 🧘 Movement & Exercise
3–4 short bullet points of gentle, condition-appropriate movement suggestions (yoga, walking, stretching, strength, etc.).

## 🧠 Mental Wellbeing
3–4 short bullet points: stress management, sleep, mindfulness, journaling, or community support that helps with this condition.

## ⚠️ When to see a doctor
3–4 bullet points of warning signs or situations where professional medical care is essential.

## 🤍 Gentle reminder
One short, warm sentence of encouragement.

End with this exact line on its own paragraph:
"⚠️ This is general educational information, not medical advice. Always consult a qualified healthcare professional for diagnosis and treatment."

STRICT RULES:
- NEVER diagnose. NEVER prescribe specific medications or dosages.
- If the condition is an emergency (e.g. chest pain, severe bleeding, suicidal thoughts), gently urge the user to seek immediate medical help and keep the rest of the response brief.
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

    const rawCondition = body?.condition;
    const lang = body?.lang === "kn" ? "kn" : "en";

    if (typeof rawCondition !== "string" || rawCondition.trim().length === 0) {
      return new Response(JSON.stringify({ error: "condition is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const condition = rawCondition.trim().slice(0, MAX_CONDITION_LENGTH);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: buildPrompt(condition, lang) },
          { role: "user", content: `Please share gentle wellness guidance for someone living with: ${condition}` },
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
    console.error("condition-guide unhandled error", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
