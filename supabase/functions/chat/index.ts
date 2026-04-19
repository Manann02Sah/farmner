import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, language, schemeCatalog } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

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

const systemPrompt = `You are Samarth Shayak, an AI assistant specializing in Indian government schemes for farmers, startups, and citizens. You help users discover schemes, check eligibility, and understand benefits.

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

    const conversationText = Array.isArray(messages)
      ? messages
          .map((message: Record<string, unknown>) => {
            const role = message.role === "assistant" ? "Assistant" : "User";
            const content = typeof message.content === "string" ? message.content : "";
            return `${role}: ${content}`;
          })
          .join("\n\n")
      : "";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${systemPrompt}\n\nConversation so far:\n${conversationText}\n\nRespond to the latest user request only.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
          },
        }),
      },
    );

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
      return new Response(JSON.stringify({ error: "Gemini API error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const assistantText =
      data.candidates?.[0]?.content?.parts
        ?.map((part: Record<string, unknown>) => (typeof part.text === "string" ? part.text : ""))
        .join("")?.trim() ?? "";

    if (!assistantText) {
      return new Response(JSON.stringify({ error: "Gemini returned an empty response" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ text: assistantText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
