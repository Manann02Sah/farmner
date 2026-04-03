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
    ? "Hindi or Hinglish about Indian government schemes, farmers, Aadhaar, PAN card, subsidy, loan, eligibility"
    : "Indian government scheme, farmer, Aadhaar, subsidy, loan, eligibility";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

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

    const extension = getExtension(file.type);
    const fileName = `recording.${extension}`;
    const prompt = getPrompt(whisperLang);

    let response: Response;

    if (OPENAI_API_KEY) {
      const whisperForm = new FormData();
      whisperForm.append("file", new File([file], fileName, { type: file.type || "audio/webm" }));
      whisperForm.append("model", "whisper-1");
      whisperForm.append("response_format", "json");
      whisperForm.append("language", whisperLang);
      whisperForm.append("prompt", prompt);

      response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: whisperForm,
      });
    } else if (LOVABLE_API_KEY) {
      const lovableForm = new FormData();
      lovableForm.append("file", new File([file], fileName, { type: file.type || "audio/webm" }));
      lovableForm.append("model", "openai/whisper-1");
      lovableForm.append("response_format", "json");
      lovableForm.append("language", whisperLang);
      lovableForm.append("prompt", prompt);

      response = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
        body: lovableForm,
      });
    } else {
      throw new Error("No transcription key configured. Add OPENAI_API_KEY to Supabase secrets.");
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Transcription API error:", response.status, errorText);

      let errorMessage = "Audio transcription failed";
      if (response.status === 429) errorMessage = "Rate limit exceeded. Please try again shortly.";
      else if (response.status === 402) errorMessage = "AI credits exhausted.";
      else if (response.status === 413) errorMessage = "Recording too large. Please try a shorter clip.";
      else if (response.status === 415) errorMessage = "Unsupported audio format.";
      else if (response.status === 401 || response.status === 403) errorMessage = "Transcription service is not authorized.";

      return new Response(JSON.stringify({ error: errorMessage }), {
        status: response.status >= 400 && response.status < 600 ? response.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const transcript = String(result.text ?? "").trim();

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
