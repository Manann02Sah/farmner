import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, language, schemeCatalog } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const lang = language === "hi" ? "Hindi" : "English";
    const matchedSchemes = Array.isArray(schemeCatalog) ? schemeCatalog.slice(0, 8) : [];
    const catalogPrompt = matchedSchemes.length
      ? `Use the following in-app scheme catalog as your primary recommendations whenever it fits the user request. Prefer these schemes over inventing new ones.

${matchedSchemes
  .map((scheme: Record<string, unknown>, index: number) =>
    `${index + 1}. ${scheme.title} | Category: ${scheme.category} | State: ${scheme.state} | Benefit Type: ${scheme.benefit_type} | Max Benefit: ${scheme.max_benefit ?? "Not specified"} | Description: ${scheme.description} | Eligibility: ${scheme.eligibility ?? "Not specified"}`
  )
  .join("\n")}`
      : "If no in-app scheme catalog is provided, answer normally.";

    const systemPrompt = `You are Samarth Sahayak, an AI assistant specializing in Indian government schemes for farmers, startups, and citizens. You help users discover schemes, check eligibility, and understand benefits.

IMPORTANT RULES:
- Always respond in ${lang}.
- Provide specific scheme names, benefits, and eligibility criteria when possible.
- Prefer recommending schemes from the supplied in-app catalog when they match the user's needs.
- Reference official government sources.
- Be concise but thorough.
- If asked about eligibility, ask for relevant details like state, occupation, income, landholding.
- Format responses with bold headers using ** for scheme names.
- When listing schemes, number them.

${catalogPrompt}`;

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
