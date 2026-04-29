import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_MODEL = "gemini-2.5-flash";
const OPENAI_CHAT_MODEL = "gpt-4o-mini";

type ProviderFailure = {
  status: number;
  message: string;
  provider: "gemini" | "openai";
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function shouldFallbackToOpenAI(status: number) {
  return status === 401 || status === 403 || status === 404 || status === 429 || status >= 500;
}

async function getGeminiErrorMessage(response: Response, fallbackMessage: string) {
  const responseText = await response.text();
  console.error("AI gateway error:", response.status, responseText);

  if (!responseText.trim()) {
    return `${fallbackMessage} (status ${response.status})`;
  }

  try {
    const parsed = JSON.parse(responseText) as {
      error?: { message?: string; status?: string };
    };
    const detail = parsed.error?.message?.trim() || parsed.error?.status?.trim() || "";
    return detail ? `${fallbackMessage}: ${detail}` : `${fallbackMessage} (status ${response.status})`;
  } catch {
    return `${fallbackMessage} (status ${response.status})`;
  }
}

async function getOpenAIErrorMessage(response: Response, fallbackMessage: string) {
  const responseText = await response.text();
  console.error("OpenAI chat error:", response.status, responseText);

  if (!responseText.trim()) {
    return `${fallbackMessage} (status ${response.status})`;
  }

  try {
    const parsed = JSON.parse(responseText) as {
      error?: { message?: string; code?: string; type?: string };
    };
    const detail =
      parsed.error?.message?.trim() || parsed.error?.code?.trim() || parsed.error?.type?.trim() || "";
    return detail ? `${fallbackMessage}: ${detail}` : `${fallbackMessage} (status ${response.status})`;
  } catch {
    return `${fallbackMessage} (status ${response.status})`;
  }
}

function getSystemPrompt(
  language: string,
  schemeCatalog: unknown,
  recommendationMode: unknown,
  usedSignals: unknown,
  unknowns: unknown,
) {
  const lang = language === "hi" ? "Hindi" : "English";
  const matchedSchemes = Array.isArray(schemeCatalog) ? schemeCatalog.slice(0, 8) : [];
  const catalogPrompt = matchedSchemes.length
    ? `Use the following in-app scheme catalog only when the conversation is ready for concrete recommendations. Keep the shortlist to the strongest matches and avoid recommending weak fits.

${matchedSchemes
  .map((scheme: Record<string, unknown>, index: number) =>
    `${index + 1}. ${scheme.title} | Category: ${scheme.category} | State: ${scheme.state} | Benefit Type: ${scheme.benefit_type} | Max Benefit: ${scheme.max_benefit ?? "Not specified"} | Description: ${scheme.description} | Eligibility: ${scheme.eligibility ?? "Not specified"}`
  )
  .join("\n")}`
    : "No shortlist is ready yet. Continue the conversation naturally and ask one focused follow-up question if important context is still missing.";

  const recommendationGuidance =
    recommendationMode === "explicit_request"
      ? "The user is explicitly asking for schemes or best-fit options. You may recommend up to 3 schemes from the in-app shortlist and explain why they fit."
      : recommendationMode === "high_confidence"
        ? "You have enough context to mention that strong matches are ready. Do not force a full list unless it feels natural; a soft handoff to the shortlist is preferred."
        : "Do not force scheme recommendations in this reply. Continue the conversation naturally, answer the user's latest request, and ask at most one concise follow-up question if state, crop/business type, or income/land details are needed.";

  const signalPrompt = `Known signals: ${Array.isArray(usedSignals) && usedSignals.length ? usedSignals.join(" | ") : "None yet"}.
Still unknown: ${Array.isArray(unknowns) && unknowns.length ? unknowns.join(" | ") : "No major gaps flagged"}.`;

  return `You are Samarth Shayak, an AI assistant specializing in Indian government schemes for farmers, startups, and citizens. You help users discover schemes, check eligibility, and understand benefits.

IMPORTANT RULES:
- Always respond in ${lang}.
- Keep the conversation natural and grounded in what the user has already shared.
- Provide specific scheme names, benefits, and eligibility criteria only when the conversation is ready for recommendations.
- If important facts are missing, ask one concise follow-up question instead of listing generic schemes.
- Reference official government sources.
- Be concise but thorough.
- If asked about eligibility, ask for only the most relevant missing details like state, occupation, income, or landholding.
- Format responses with bold headers using ** for scheme names.
- When listing schemes, number them and keep the list to 3 or fewer.
- Respond to the latest user request only.

${recommendationGuidance}
${signalPrompt}

${catalogPrompt}`;
}

function buildConversationText(messages: unknown) {
  return Array.isArray(messages)
    ? messages
        .map((message: Record<string, unknown>) => {
          const role = message.role === "assistant" ? "Assistant" : "User";
          const content = typeof message.content === "string" ? message.content : "";
          return `${role}: ${content}`;
        })
        .join("\n\n")
    : "";
}

function buildOpenAIInput(systemPrompt: string, messages: unknown) {
  const promptPreamble = [
    {
      role: "developer",
      content: [{ type: "input_text", text: systemPrompt }],
    },
  ];

  if (!Array.isArray(messages)) {
    return promptPreamble;
  }

  const conversation = messages.map((message: Record<string, unknown>) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: [
      {
        type: "input_text",
        text: typeof message.content === "string" ? message.content : "",
      },
    ],
  }));

  return [...promptPreamble, ...conversation];
}

function extractGeminiText(data: Record<string, unknown>) {
  const candidates = Array.isArray(data.candidates) ? (data.candidates as Array<Record<string, unknown>>) : [];
  const firstCandidate = candidates[0];
  const content = firstCandidate?.content;
  const parts =
    content && typeof content === "object" && Array.isArray((content as Record<string, unknown>).parts)
      ? ((content as Record<string, unknown>).parts as Array<Record<string, unknown>>)
      : [];

  return parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

function extractOpenAIText(data: Record<string, unknown>) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const output = Array.isArray(data.output) ? (data.output as Array<Record<string, unknown>>) : [];
  const text = output
    .flatMap((item) => {
      const content = Array.isArray(item.content) ? (item.content as Array<Record<string, unknown>>) : [];
      return content
        .map((part) => {
          if (typeof part.text === "string") return part.text;
          if (typeof part.refusal === "string") return part.refusal;

          const nestedText = part.text;
          if (nestedText && typeof nestedText === "object" && typeof (nestedText as Record<string, unknown>).value === "string") {
            return String((nestedText as Record<string, unknown>).value);
          }

          return "";
        })
        .filter(Boolean);
    })
    .join("")
    .trim();

  return text;
}

async function requestGeminiChat(apiKey: string | null, systemPrompt: string, conversationText: string) {
  if (!apiKey) {
    return {
      ok: false as const,
      failure: {
        status: 503,
        message: "GEMINI_API_KEY is not configured",
        provider: "gemini" as const,
      },
    };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
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
                text: `${systemPrompt}\n\nConversation so far:\n${conversationText}`,
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
    const fallbackMessage =
      response.status === 401 || response.status === 403
        ? "Gemini API is not authorized. Check GEMINI_API_KEY and its API restrictions"
        : response.status === 404
          ? "Gemini model endpoint was not found"
          : response.status === 400
            ? "Gemini rejected the request"
            : "Gemini API error";
    const errorMessage = await getGeminiErrorMessage(response, fallbackMessage);
    return {
      ok: false as const,
      failure: {
        status: response.status >= 400 && response.status < 600 ? response.status : 500,
        message: errorMessage,
        provider: "gemini" as const,
      },
    };
  }

  const data = await response.json();
  const assistantText = extractGeminiText(data);
  if (!assistantText) {
    return {
      ok: false as const,
      failure: {
        status: 502,
        message: "Gemini returned an empty response",
        provider: "gemini" as const,
      },
    };
  }

  return { ok: true as const, text: assistantText };
}

async function requestOpenAIChat(apiKey: string | null, systemPrompt: string, messages: unknown) {
  if (!apiKey) {
    return {
      ok: false as const,
      failure: {
        status: 503,
        message: "OPENAI_API_KEY is not configured",
        provider: "openai" as const,
      },
    };
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_CHAT_MODEL,
      input: buildOpenAIInput(systemPrompt, messages),
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const fallbackMessage =
      response.status === 401 || response.status === 403
        ? "OpenAI API is not authorized. Check OPENAI_API_KEY"
        : response.status === 404
          ? "OpenAI chat endpoint was not found"
          : response.status === 429
            ? "OpenAI rate limit exceeded"
            : "OpenAI chat error";
    const errorMessage = await getOpenAIErrorMessage(response, fallbackMessage);
    return {
      ok: false as const,
      failure: {
        status: response.status >= 400 && response.status < 600 ? response.status : 500,
        message: errorMessage,
        provider: "openai" as const,
      },
    };
  }

  const data = await response.json();
  const assistantText = extractOpenAIText(data);
  if (!assistantText) {
    return {
      ok: false as const,
      failure: {
        status: 502,
        message: "OpenAI returned an empty response",
        provider: "openai" as const,
      },
    };
  }

  return { ok: true as const, text: assistantText };
}

function combineFailures(primaryFailure: ProviderFailure, fallbackFailure: ProviderFailure) {
  return `${primaryFailure.message} Fallback to ${fallbackFailure.provider} also failed: ${fallbackFailure.message}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, language, schemeCatalog, recommendationMode, usedSignals, unknowns } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const systemPrompt = getSystemPrompt(language, schemeCatalog, recommendationMode, usedSignals, unknowns);
    const conversationText = buildConversationText(messages);

    const geminiResult = await requestGeminiChat(GEMINI_API_KEY, systemPrompt, conversationText);
    if (geminiResult.ok) {
      return jsonResponse({ text: geminiResult.text });
    }

    if (!shouldFallbackToOpenAI(geminiResult.failure.status)) {
      return jsonResponse({ error: geminiResult.failure.message }, geminiResult.failure.status);
    }

    console.warn("Gemini chat failed, trying OpenAI fallback", geminiResult.failure);
    const openAIResult = await requestOpenAIChat(OPENAI_API_KEY, systemPrompt, messages);
    if (openAIResult.ok) {
      return jsonResponse({ text: openAIResult.text });
    }

    return jsonResponse(
      { error: combineFailures(geminiResult.failure, openAIResult.failure) },
      openAIResult.failure.status,
    );
  } catch (e) {
    console.error("chat error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
