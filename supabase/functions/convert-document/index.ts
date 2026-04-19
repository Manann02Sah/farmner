import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type HttpError = Error & { status?: number };

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function createHttpError(message: string, status = 400): HttpError {
  const error = new Error(message) as HttpError;
  error.status = status;
  return error;
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

function guessMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
  };
  return map[ext] ?? "application/octet-stream";
}

function normalizeLanguage(value: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized.startsWith("hi")) {
    return "hi" as const;
  }

  return "en" as const;
}

function languageName(value: "en" | "hi") {
  return value === "hi" ? "Hindi" : "English";
}

function parseTranslationResult(rawText: string, fallbackSource: "en" | "hi") {
  try {
    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      originalText:
        typeof parsed.originalText === "string" && parsed.originalText.trim()
          ? parsed.originalText.trim()
          : "",
      translatedText:
        typeof parsed.translatedText === "string" && parsed.translatedText.trim()
          ? parsed.translatedText.trim()
          : "",
      detectedSourceLanguage:
        typeof parsed.detectedSourceLanguage === "string" && parsed.detectedSourceLanguage.trim()
          ? parsed.detectedSourceLanguage.trim()
          : languageName(fallbackSource),
      warnings: Array.isArray(parsed.warnings)
        ? parsed.warnings.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
        : [],
      ocrPerformed: true,
    };
  } catch {
    return {
      originalText: "",
      translatedText: rawText.trim(),
      detectedSourceLanguage: languageName(fallbackSource),
      warnings: ["Structured OCR output was not returned. Review the translated text carefully."],
      ocrPerformed: true,
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw createHttpError("GEMINI_API_KEY is not configured in Supabase secrets.", 503);
    }
    const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";

    let fileName = "";
    let fileBase64 = "";
    let fileMimeType = "";
    let sourceLanguage = "en";
    let targetLanguage = "hi";

    const prefersJson = contentType.includes("application/json") || contentType.includes("text/json");
    const prefersMultipart = contentType.includes("multipart/form-data");

    let payloadParsed = false;

    const parseMultipart = async () => {
      const formData = await req.clone().formData();
      fileName = String(formData.get("fileName") ?? "");
      sourceLanguage = String(formData.get("sourceLanguage") ?? "en");
      targetLanguage = String(formData.get("targetLanguage") ?? "hi");

      const file = formData.get("file");
      if (file instanceof File && file.size > 0) {
        const buffer = await file.arrayBuffer();
        fileBase64 = arrayBufferToBase64(buffer);
        fileMimeType = file.type || guessMimeType(fileName || file.name);
        fileName = file.name || fileName;
      }

      payloadParsed = true;
    };

    const parseJson = async () => {
      const body = await req.clone().json();
      fileName = body.fileName ?? "";
      sourceLanguage = body.sourceLanguage ?? "en";
      targetLanguage = body.targetLanguage ?? "hi";
      fileBase64 = body.fileBase64 ?? "";
      fileMimeType = body.fileMimeType || guessMimeType(fileName);
      payloadParsed = true;
    };

    if (prefersMultipart) {
      await parseMultipart();
    } else {
      try {
        await parseJson();
      } catch (jsonError) {
        if (prefersJson) {
          throw jsonError;
        }

        try {
          await parseMultipart();
        } catch (multipartError) {
          console.error("convert-document payload parse error:", { jsonError, multipartError });
        }
      }
    }

    if (!payloadParsed) {
      throw createHttpError("Could not read the uploaded document payload. Please re-upload the file and try again.");
    }

    if (!fileBase64) {
      throw createHttpError("Please upload a PDF or document scan before starting the conversion.");
    }

    const normalizedSourceLanguage = normalizeLanguage(sourceLanguage);
    const normalizedTargetLanguage = normalizeLanguage(targetLanguage);

    if (normalizedSourceLanguage === normalizedTargetLanguage) {
      throw createHttpError("Choose different source and target languages for document conversion.");
    }

    const isImage = fileMimeType.startsWith("image/");
    const isPdf = fileMimeType === "application/pdf";

    if (!isImage && !isPdf) {
      throw createHttpError("Only PDF, JPG, JPEG, PNG, and WEBP files are supported for conversion.");
    }

    const sourceLanguageName = languageName(normalizedSourceLanguage);
    const targetLanguageName = languageName(normalizedTargetLanguage);

    const systemPrompt = `You are a strict OCR and translation assistant for official documents.
Read only the actual uploaded file content.
Do not invent missing text.
Preserve headings, tables, bullet points, line breaks, numeric values, names, and official identifiers as faithfully as possible.
If part of the source is unreadable, mark it with [illegible].
Respond with JSON containing exactly these fields:
- originalText: string
- translatedText: string
- detectedSourceLanguage: string
- warnings: array of strings`;

    const translationPrompt = `Perform OCR on the uploaded document and translate it from ${sourceLanguageName} to ${targetLanguageName}.
Use the uploaded file content itself, not the file name.
If the visible language does not match the requested source language, mention that in warnings but still translate what is visible.
Keep the translated output readable and structured for a user who wants the document text in ${targetLanguageName}.`;

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
                { text: `${systemPrompt}\n\n${translationPrompt}` },
                {
                  inline_data: {
                    mime_type: fileMimeType,
                    data: fileBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini document conversion error:", response.status, errorText);
      throw createHttpError("The document conversion service could not complete the OCR request.", 502);
    }

    const data = await response.json();
    const rawText = String(
      data.candidates?.[0]?.content?.parts
        ?.map((part: Record<string, unknown>) => (typeof part.text === "string" ? part.text : ""))
        .join("") ?? "",
    );
    const result = parseTranslationResult(rawText, normalizedSourceLanguage);

    if (!result.translatedText) {
      throw createHttpError("The conversion service returned an empty translation. Please try a clearer document.", 502);
    }

    return jsonResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status =
      typeof (error as HttpError).status === "number" ? (error as HttpError).status as number : 500;

    console.error("convert-document error:", error);
    return jsonResponse({ error: message }, status);
  }
});
