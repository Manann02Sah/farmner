import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const language = String(formData.get("language") ?? "en");
    const whisperLang = normalizeLanguage(language);

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Audio file is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (file.size > 25 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "Audio file too large (max 25MB)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (file.size < 100) {
      return new Response(JSON.stringify({ error: "Audio file is empty or too short" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = getPrompt(whisperLang);
    const buffer = await file.arrayBuffer();
    const audioBase64 = arrayBufferToBase64(buffer);
    const mimeType = file.type || `audio/${getExtension(file.type)}`;

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini transcription error:", response.status, errorText);

      let errorMessage = "Audio transcription failed";
      if (response.status === 429) errorMessage = "Rate limit exceeded. Please try again shortly.";
      else if (response.status === 413) errorMessage = "Recording too large. Please try a shorter clip.";
      else if (response.status === 415) errorMessage = "Unsupported audio format.";
      else if (response.status === 401 || response.status === 403) errorMessage = "Transcription service is not authorized.";

      return new Response(JSON.stringify({ error: errorMessage }), {
        status: response.status >= 400 && response.status < 600 ? response.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const transcript = String(
      result.candidates?.[0]?.content?.parts
        ?.map((part: Record<string, unknown>) => (typeof part.text === "string" ? part.text : ""))
        .join("") ?? "",
    ).trim();

    if (!transcript) {
      return new Response(
        JSON.stringify({
          error: whisperLang === "hi" ? "कोई आवाज़ समझ में नहीं आई। कृपया स्पष्ट रूप से बोलें।" : "No speech detected. Please speak clearly.",
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`[${whisperLang}] Transcribed: "${transcript.slice(0, 80)}..."`);

    return new Response(JSON.stringify({ text: transcript, language: whisperLang }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("transcribe-audio error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown transcription error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
