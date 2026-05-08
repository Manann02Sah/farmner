import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getGeminiApiKeys, getGeminiKeyError } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_MODEL = "gemini-2.5-flash";
const OPENAI_TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe";

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
  console.error("Gemini transcription error:", response.status, responseText);

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
  console.error("OpenAI transcription error:", response.status, responseText);

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

function getExtension(mimeType: string): string {
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("mp3") || mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

function normalizeLanguage(value: string): "hi" | "en" {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("hi") ? "hi" : "en";
}

function getPrompt(language: "hi" | "en") {
  return language === "hi"
    ? "Transcribe this audio accurately in Hindi or Hinglish. Return only the spoken words. The topic may include Indian government schemes, farmers, Aadhaar, PAN card, subsidy, loan, and eligibility."
    : "Transcribe this audio accurately in English. Return only the spoken words. The topic may include Indian government schemes, farmer support, Aadhaar, subsidy, loan, and eligibility.";
}

function getNoSpeechMessage(language: "hi" | "en") {
  return language === "hi"
    ? "Koi speech detect nahi hui. Kripya saaf awaaz me dobara bolen."
    : "No speech detected. Please speak clearly.";
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function extractGeminiTranscript(data: Record<string, unknown>) {
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

async function requestGeminiTranscription(
  apiKeys: string[],
  prompt: string,
  file: File,
  mimeType: string,
  language: "hi" | "en",
) {
  if (apiKeys.length === 0) {
    return {
      ok: false as const,
      failure: {
        status: 503,
        message: getGeminiKeyError(),
        provider: "gemini" as const,
      },
    };
  }

  const buffer = await file.arrayBuffer();
  const audioBase64 = arrayBufferToBase64(buffer);
  let lastFailure: ProviderFailure = {
    status: 500,
    message: "Audio transcription failed",
    provider: "gemini",
  };

  for (const apiKey of apiKeys) {
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
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: audioBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
          },
        }),
      },
    );

    if (response.ok) {
      const result = await response.json();
      const transcript = extractGeminiTranscript(result);
      if (!transcript) {
        return {
          ok: false as const,
          failure: {
            status: 422,
            message: getNoSpeechMessage(language),
            provider: "gemini" as const,
          },
        };
      }

      return { ok: true as const, text: transcript };
    }

    let errorMessage = "Audio transcription failed";
    if (response.status === 429) errorMessage = "Rate limit exceeded. Please try again shortly.";
    else if (response.status === 413) errorMessage = "Recording too large. Please try a shorter clip.";
    else if (response.status === 415) errorMessage = "Unsupported audio format.";
    else if (response.status === 401 || response.status === 403) {
      errorMessage = "Transcription service is not authorized. Check Gemini key restrictions";
    } else if (response.status === 400) {
      errorMessage = "Transcription request was rejected by Gemini";
    }

    const detailedMessage = await getGeminiErrorMessage(response, errorMessage);
    lastFailure = {
      status: response.status >= 400 && response.status < 600 ? response.status : 500,
      message: detailedMessage,
      provider: "gemini" as const,
    };

    if (!shouldFallbackToOpenAI(lastFailure.status)) {
      break;
    }
  }

  return {
    ok: false as const,
    failure: lastFailure,
  };
}

async function requestOpenAITranscription(
  apiKey: string | null,
  prompt: string,
  file: File,
  language: "hi" | "en",
) {
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

  const formData = new FormData();
  formData.append("file", file, file.name || `voice-input.${getExtension(file.type)}`);
  formData.append("model", OPENAI_TRANSCRIBE_MODEL);
  formData.append("response_format", "text");
  formData.append("prompt", prompt);
  formData.append("language", language);

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = "Audio transcription failed";
    if (response.status === 429) errorMessage = "OpenAI transcription rate limit exceeded.";
    else if (response.status === 413) errorMessage = "Recording too large. Please try a shorter clip.";
    else if (response.status === 415) errorMessage = "Unsupported audio format.";
    else if (response.status === 401 || response.status === 403) errorMessage = "OpenAI transcription is not authorized. Check OPENAI_API_KEY";

    const detailedMessage = await getOpenAIErrorMessage(response, errorMessage);
    return {
      ok: false as const,
      failure: {
        status: response.status >= 400 && response.status < 600 ? response.status : 500,
        message: detailedMessage,
        provider: "openai" as const,
      },
    };
  }

  const transcript = (await response.text()).trim();
  if (!transcript) {
    return {
      ok: false as const,
      failure: {
        status: 422,
        message: getNoSpeechMessage(language),
        provider: "openai" as const,
      },
    };
  }

  return { ok: true as const, text: transcript };
}

function combineFailures(primaryFailure: ProviderFailure, fallbackFailure: ProviderFailure) {
  return `${primaryFailure.message} Fallback to ${fallbackFailure.provider} also failed: ${fallbackFailure.message}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEYS = getGeminiApiKeys();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    const formData = await req.formData();
    const file = formData.get("file");
    const language = String(formData.get("language") ?? "en");
    const whisperLang = normalizeLanguage(language);

    if (!(file instanceof File)) {
      return jsonResponse({ error: "Audio file is required" }, 400);
    }

    if (file.size > 25 * 1024 * 1024) {
      return jsonResponse({ error: "Audio file too large (max 25MB)" }, 400);
    }

    if (file.size < 100) {
      return jsonResponse({ error: "Audio file is empty or too short" }, 400);
    }

    const prompt = getPrompt(whisperLang);
    const mimeType = file.type || `audio/${getExtension(file.type)}`;
    const normalizedFile = new File([file], file.name || `voice-input.${getExtension(mimeType)}`, {
      type: mimeType,
    });

    const geminiResult = await requestGeminiTranscription(
      GEMINI_API_KEYS,
      prompt,
      normalizedFile,
      mimeType,
      whisperLang,
    );
    if (geminiResult.ok) {
      console.log(`[${whisperLang}] Transcribed via Gemini: "${geminiResult.text.slice(0, 80)}..."`);
      return jsonResponse({ text: geminiResult.text, language: whisperLang });
    }

    if (!shouldFallbackToOpenAI(geminiResult.failure.status)) {
      return jsonResponse({ error: geminiResult.failure.message }, geminiResult.failure.status);
    }

    console.warn("Gemini transcription failed, trying OpenAI fallback", geminiResult.failure);
    const openAIResult = await requestOpenAITranscription(OPENAI_API_KEY, prompt, normalizedFile, whisperLang);
    if (openAIResult.ok) {
      console.log(`[${whisperLang}] Transcribed via OpenAI: "${openAIResult.text.slice(0, 80)}..."`);
      return jsonResponse({ text: openAIResult.text, language: whisperLang });
    }

    return jsonResponse(
      { error: combineFailures(geminiResult.failure, openAIResult.failure) },
      openAIResult.failure.status,
    );
  } catch (error) {
    console.error("transcribe-audio error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown transcription error" }, 500);
  }
});
