import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_MODEL = "gemini-2.5-flash";
const CACHE_TTL_MS = 1000 * 60 * 5;
const MAX_MESSAGES = 8;
const MAX_SCHEMES = 4;

type ChatPayload = {
  messages?: Array<{ role?: string; content?: string }>;
  language?: string;
  schemeCatalog?: Array<Record<string, unknown>>;
  recommendationMode?: unknown;
  usedSignals?: string[];
  unknowns?: string[];
};

type CacheEntry = {
  expiresAt: number;
  text: string;
};

const responseCache = new Map<string, CacheEntry>();
let currentGeminiKeyIndex = 0;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getRetryMessage(language: string) {
  return language === "hi" ? "कृपया फिर प्रयास करें।" : "Try again.";
}

function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of responseCache.entries()) {
    if (value.expiresAt <= now) {
      responseCache.delete(key);
    }
  }
}

function buildCacheKey(payload: ChatPayload) {
  const messages = Array.isArray(payload.messages)
    ? payload.messages.map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: typeof message.content === "string" ? message.content.trim() : "",
      }))
    : [];

  return JSON.stringify({
    language: payload.language === "hi" ? "hi" : "en",
    recommendationMode: payload.recommendationMode,
    messages,
    schemeCatalog: Array.isArray(payload.schemeCatalog) ? payload.schemeCatalog.slice(0, MAX_SCHEMES) : [],
    usedSignals: Array.isArray(payload.usedSignals) ? payload.usedSignals.slice(0, 4) : [],
    unknowns: Array.isArray(payload.unknowns) ? payload.unknowns.slice(0, 3) : [],
  });
}

function shouldRetryGemini(status: number) {
  return status === 401 || status === 403 || status === 404 || status === 429 || status >= 500;
}

function getGeminiApiKeys() {
  const keys = [
    Deno.env.get("GEMINI_API_KEY_1"),
    Deno.env.get("GEMINI_API_KEY_2"),
    Deno.env.get("GEMINI_API_KEY_3"),
    Deno.env.get("GEMINI_API_KEY_4"),
    Deno.env.get("GEMINI_API_KEY"),
  ]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean);

  return [...new Set(keys)];
}

function getRotatedKeys(keys: string[]) {
  if (keys.length === 0) return [];
  const start = currentGeminiKeyIndex % keys.length;
  return [...keys.slice(start), ...keys.slice(0, start)];
}

function advanceKeyIndex(keysLength: number, offset: number) {
  if (keysLength <= 0) return;
  currentGeminiKeyIndex = (currentGeminiKeyIndex + offset + 1) % keysLength;
}

function trimMessages(messages: ChatPayload["messages"]) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter((message) => typeof message?.content === "string" && message.content.trim())
    .slice(-MAX_MESSAGES)
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: String(message.content).trim().slice(0, 1400),
    }));
}

function getSystemPrompt(
  language: string,
  schemeCatalog: unknown,
  recommendationMode: unknown,
  usedSignals: unknown,
  unknowns: unknown,
) {
  const lang = language === "hi" ? "Hindi" : "English";
  const matchedSchemes = Array.isArray(schemeCatalog) ? schemeCatalog.slice(0, MAX_SCHEMES) : [];
  const catalogPrompt = matchedSchemes.length
    ? `Use the following in-app scheme catalog only when the user is ready for concrete recommendations.

${matchedSchemes
  .map((scheme: Record<string, unknown>, index: number) =>
    `${index + 1}. ${scheme.title} | Category: ${scheme.category} | State: ${scheme.state} | Benefit Type: ${scheme.benefit_type} | Max Benefit: ${scheme.max_benefit ?? "Not specified"} | Description: ${scheme.description} | Eligibility: ${scheme.eligibility ?? "Not specified"}`
  )
  .join("\n")}`
    : "No shortlist is ready yet. Continue naturally and ask one focused follow-up question only if it truly helps.";

  const recommendationGuidance =
    recommendationMode === "explicit_request"
      ? "The user explicitly asked for schemes. Recommend up to 3 strong matches from the shortlist and explain the fit clearly."
      : recommendationMode === "high_confidence"
        ? "You have enough context to mention that strong matches are ready, but do not force the list if it would interrupt the conversation."
        : "Do not force scheme recommendations in this reply. Answer the latest request naturally and ask at most one concise follow-up question if needed.";

  const signalPrompt = `Known signals: ${Array.isArray(usedSignals) && usedSignals.length ? usedSignals.join(" | ") : "None yet"}.
Still unknown: ${Array.isArray(unknowns) && unknowns.length ? unknowns.join(" | ") : "No major gaps flagged"}.`;

  return `You are Samarth Shayak, an AI assistant that helps Indian users understand government schemes, eligibility, documents, and practical next steps.

IMPORTANT RULES:
- Always respond in ${lang}.
- Keep the answer concise, natural, and directly useful.
- Focus only on the latest user request.
- Use scheme names exactly as provided when you recommend them.
- Recommend at most 3 schemes.
- Ask at most one concise follow-up question if needed.
- Do not mention internal tools, providers, or system behavior.

${recommendationGuidance}
${signalPrompt}

${catalogPrompt}`;
}

function buildConversationText(messages: Array<{ role: string; content: string }>) {
  return messages.map((message) => `${message.role === "assistant" ? "Assistant" : "User"}: ${message.content}`).join("\n\n");
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

async function requestGeminiChat(apiKey: string, systemPrompt: string, conversationText: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
          temperature: 0.35,
          topP: 0.9,
          maxOutputTokens: 700,
        },
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.warn("Gemini request failed", { status: response.status, detail });
    return { ok: false as const, status: response.status };
  }

  const data = (await response.json()) as Record<string, unknown>;
  const assistantText = extractGeminiText(data);
  if (!assistantText) {
    return { ok: false as const, status: 502 };
  }

  return { ok: true as const, text: assistantText };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as ChatPayload;
    const language = payload.language === "hi" ? "hi" : "en";
    cleanupCache();

    const cacheKey = buildCacheKey(payload);
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return jsonResponse({ text: cached.text });
    }

    const keys = getGeminiApiKeys();
    if (keys.length === 0) {
      console.error("No Gemini keys configured");
      return jsonResponse({ error: getRetryMessage(language) }, 503);
    }

    const messages = trimMessages(payload.messages);
    const systemPrompt = getSystemPrompt(
      language,
      payload.schemeCatalog,
      payload.recommendationMode,
      payload.usedSignals,
      payload.unknowns,
    );
    const conversationText = buildConversationText(messages);
    const rotatedKeys = getRotatedKeys(keys);

    for (let index = 0; index < rotatedKeys.length; index += 1) {
      const result = await requestGeminiChat(rotatedKeys[index], systemPrompt, conversationText);
      if (result.ok) {
        responseCache.set(cacheKey, {
          text: result.text,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
        advanceKeyIndex(keys.length, index);
        return jsonResponse({ text: result.text });
      }

      if (!shouldRetryGemini(result.status)) {
        break;
      }
    }

    return jsonResponse({ error: getRetryMessage(language) }, 503);
  } catch (error) {
    console.error("chat error:", error);
    return jsonResponse({ error: "Try again." }, 500);
  }
});
