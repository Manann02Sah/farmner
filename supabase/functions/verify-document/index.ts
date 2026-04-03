import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Document-specific OCR extraction rules
const DOC_EXTRACTION_RULES: Record<string, string> = {
  "Aadhaar Card": "Look for: 12-digit Aadhaar number, full name, date of birth, address, and QR code. The number format is XXXX XXXX XXXX.",
  "PAN Card": "Look for: 10-character alphanumeric PAN (format: AAAAA9999A), full name, father's name, date of birth, and Income Tax Department logo.",
  "Land Ownership Document": "Look for: Survey/Khasra number, owner name, area in acres/hectares, village/district, registration number, and official seal.",
  "Bank Passbook": "Look for: Account number, IFSC code, bank name, branch, account holder name, and recent transaction entries.",
  "Kisan Registration": "Look for: Farmer registration ID, name, landholding details, state, and registration authority.",
  "Business Registration": "Look for: CIN/registration number, company/firm name, date of incorporation, registered address, and authority seal.",
  "GST Certificate": "Look for: 15-digit GSTIN (format: 2 digits state + 10 PAN + 1 entity + 1 Z + 1 check), business name, and registration date.",
  "DPIIT Recognition Certificate": "Look for: DPIIT number, startup name, recognition date, and ministry seal.",
  "Incorporation Certificate": "Look for: CIN number, company name, date of incorporation, ROC details, and MCA seal.",
  "Income Certificate": "Look for: Applicant name, annual income figure (in rupees), issuing authority (Tehsildar/SDM), issue date, and official seal.",
  "Ration Card": "Look for: Ration card number, family head name, category (APL/BPL/AAY), district, and state government seal.",
  "Birth Certificate": "Look for: Full name, date of birth, place of birth, registration number, and municipal/gram panchayat seal.",
  "Medical Records": "Look for: Patient name, diagnosis, treating doctor's name and registration number, hospital name, and date.",
  "Mark Sheets": "Look for: Student name, roll number, institution name, board/university name, year, subjects with marks, and result.",
  "Caste Certificate": "Look for: Applicant name, caste/sub-caste, state, issuing authority, certificate number, and official seal.",
  "Income Proof": "Look for: ITR acknowledgment number OR salary slips with employer name, OR Form 16 with TAN, and income amount.",
  "Bank Statement": "Look for: Account number, IFSC code, statement period, opening/closing balance, and bank header.",
  "Collateral Documents": "Look for: Property details, valuation, owner name, registration number, and registrar seal.",
  "Land Documents": "Look for: Plot/survey number, area, location (village/district), owner name, and registration details.",
  "Pitch Deck": "Look for: Startup name, problem statement, solution, market size, team details, and funding ask.",
  "Medical Reports": "Look for: Patient name, test names, results, reference ranges, lab name, and doctor signature.",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

function createReviewResult(message: string, tips: string[] = [], extractedText = "No OCR performed") {
  return {
    status: "NEEDS_REVIEW",
    confidence: 0,
    message,
    extractedText,
    detectedFields: [],
    missingFields: [],
    tips,
    ocrPerformed: false,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";

    if (!ANTHROPIC_API_KEY && !LOVABLE_API_KEY) {
      throw new Error("No AI API key configured. Set ANTHROPIC_API_KEY in Supabase secrets.");
    }

    // Parse uploads robustly; some clients send multipart bodies even when the
    // content-type is missing or altered by an intermediate proxy.
    let documentType = "";
    let fileName = "";
    let schemeTitle = "";
    let language = "en";
    let fileBase64 = "";
    let fileMimeType = "";
    let hasFileContent = false;

    const prefersJson = contentType.includes("application/json") || contentType.includes("text/json");
    const prefersMultipart = contentType.includes("multipart/form-data");

    let payloadParsed = false;

    const parseMultipart = async () => {
      const formData = await req.clone().formData();
      documentType = String(formData.get("documentType") ?? "");
      fileName = String(formData.get("fileName") ?? "");
      schemeTitle = String(formData.get("schemeTitle") ?? "");
      language = String(formData.get("language") ?? "en");

      const file = formData.get("file");
      if (file instanceof File && file.size > 0) {
        const buffer = await file.arrayBuffer();
        fileBase64 = arrayBufferToBase64(buffer);
        fileMimeType = file.type || guessMimeType(fileName || file.name);
        hasFileContent = true;
        fileName = file.name || fileName;
      }

      payloadParsed = true;
    };

    const parseJson = async () => {
      const body = await req.clone().json();
      documentType = body.documentType ?? "";
      fileName = body.fileName ?? "";
      schemeTitle = body.schemeTitle ?? "";
      language = body.language ?? "en";

      if (body.fileBase64) {
        fileBase64 = body.fileBase64;
        fileMimeType = body.fileMimeType || guessMimeType(fileName);
        hasFileContent = true;
      }

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
          console.error("verify-document payload parse error:", { jsonError, multipartError });
        }
      }
    }

    if (!payloadParsed) {
      throw new Error("Could not read the uploaded document payload. Please re-upload the file and try again.");
    }

    const lang = language === "hi" ? "Hindi" : "English";
    const extractionRule = DOC_EXTRACTION_RULES[documentType] || "Look for key identifying information, official stamps/seals, dates, and reference numbers.";

    let analysisPrompt = "";
    let messageContent: unknown[] = [];

    if (!hasFileContent || !fileBase64) {
      return jsonResponse(
        createReviewResult(
          language === "hi"
            ? "वास्तविक OCR स्कैन शुरू नहीं हो सका क्योंकि फ़ाइल सामग्री पढ़ी नहीं जा सकी।"
            : "Actual OCR could not start because the uploaded file content could not be read.",
          language === "hi"
            ? ["फाइल को फिर से अपलोड करें।", "PDF, JPG, JPEG, PNG, या WEBP फ़ाइल का उपयोग करें।"]
            : ["Re-upload the file.", "Use a PDF, JPG, JPEG, PNG, or WEBP document."],
        ),
      );
    }

    const isImage = fileMimeType.startsWith("image/");
    const isPDF = fileMimeType === "application/pdf";

    if (isImage) {
      analysisPrompt = `You are an expert Indian government document verification officer. Analyze the uploaded document image for the scheme "${schemeTitle}".

Expected document type: "${documentType}"
Extraction guide: ${extractionRule}

Rules:
1. Perform OCR on the actual uploaded document content.
2. Do not infer correctness from the expected document type or file name alone.
3. Confirm whether the visible content really matches "${documentType}".
4. Extract all visible text that matters for verification.
5. Identify present fields, missing fields, seals, signatures, dates, numbers, and authenticity markers.
6. If the image is unclear, incomplete, blurry, or mismatched, return NEEDS_REVIEW or REJECTED.

Respond only in ${lang}.`;

      messageContent = [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: fileMimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: fileBase64,
          },
        },
        { type: "text", text: analysisPrompt },
      ];
    } else if (isPDF) {
      if (!ANTHROPIC_API_KEY) {
        return jsonResponse(
          createReviewResult(
            language === "hi"
              ? "PDF के लिए वास्तविक OCR इस बैकएंड कॉन्फ़िगरेशन में उपलब्ध नहीं है। कृपया दस्तावेज़ की साफ़ JPG/PNG इमेज अपलोड करें।"
              : "Actual OCR for PDF uploads is not available with the current backend configuration. Please upload a clear JPG or PNG image of the document.",
            language === "hi"
              ? ["PDF की जगह मोबाइल स्कैन की इमेज अपलोड करें।", "यदि आप बैकएंड चलाते हैं, तो PDF OCR के लिए ANTHROPIC_API_KEY सक्षम करें।"]
              : ["Upload a phone scan as JPG or PNG instead of PDF.", "If you manage the backend, enable ANTHROPIC_API_KEY for direct PDF OCR."],
          ),
        );
      }

      analysisPrompt = `You are an expert Indian government document verification officer. Analyze the uploaded PDF document for the scheme "${schemeTitle}".

Expected document type: "${documentType}"
Extraction guide: ${extractionRule}

Rules:
1. Perform OCR on the actual PDF content.
2. Do not infer correctness from the expected document type or file name alone.
3. Confirm whether the visible content really matches "${documentType}".
4. Extract all visible text that matters for verification.
5. Identify present fields, missing fields, seals, signatures, dates, numbers, and authenticity markers.
6. If the PDF is unclear, incomplete, blurry, or mismatched, return NEEDS_REVIEW or REJECTED.

Respond only in ${lang}.`;

      messageContent = [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: fileBase64,
          },
        },
        { type: "text", text: analysisPrompt },
      ];
    } else {
      return jsonResponse(
        createReviewResult(
          language === "hi"
            ? "यह फ़ाइल प्रकार वास्तविक OCR स्कैन के लिए समर्थित नहीं है। कृपया PDF, JPG, JPEG, PNG, या WEBP अपलोड करें।"
            : "This file type is not supported for actual OCR scanning. Please upload PDF, JPG, JPEG, PNG, or WEBP.",
          language === "hi"
            ? ["समर्थित फ़ॉर्मैट में फिर से अपलोड करें।"]
            : ["Re-upload the document in a supported format."],
        ),
      );
    }

    const systemPrompt = `You are a strict but helpful Indian government document verification AI. 
You perform OCR analysis on uploaded documents and verify them for government scheme applications.
Base every decision only on the visible content extracted from the uploaded document. Never verify a document from its expected type or file name alone.
Always respond with a JSON object containing exactly these fields:
- status: "VERIFIED" | "NEEDS_REVIEW" | "REJECTED"
- confidence: number 0-100
- message: string (summary of verification result)
- extractedText: string (key text extracted via OCR, or "No file content available")  
- detectedFields: array of strings (fields successfully found in the document)
- missingFields: array of strings (required fields not found)
- tips: array of strings (actionable advice for the user)
- ocrPerformed: boolean (true if actual document content was analyzed)

Be strict: VERIFIED only if all key required fields are clearly present. NEEDS_REVIEW if partially legible or minor issues. REJECTED if wrong document type, heavily tampered, or illegible.`;

    let aiResponse: Response;

    if (ANTHROPIC_API_KEY) {
      // Primary: Anthropic Claude with vision for real OCR
      aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: messageContent,
            },
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("Anthropic API error:", aiResponse.status, errText);
        throw new Error(`AI verification failed: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const rawText = aiData.content?.[0]?.text ?? "";

      const result = parseVerificationResult(rawText, hasFileContent);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (LOVABLE_API_KEY) {
      // Fallback: Lovable gateway (vision model)
      // For Lovable gateway, convert content for OpenAI-compatible format
      const openaiMessages: unknown[] = [];
      
      if (hasFileContent && fileBase64 && (fileMimeType.startsWith("image/"))) {
        openaiMessages.push({
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${fileMimeType};base64,${fileBase64}` },
            },
            { type: "text", text: (messageContent as {type: string, text?: string}[]).find(m => m.type === "text")?.text ?? analysisPrompt },
          ],
        });
      } else {
        openaiMessages.push({
          role: "user",
          content: analysisPrompt,
        });
      }

      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...openaiMessages,
          ],
          max_tokens: 1024,
          response_format: { type: "json_object" },
        }),
      });

      if (!aiResponse.ok) {
        const t = await aiResponse.text();
        console.error("Lovable AI error:", aiResponse.status, t);
        throw new Error("Verification failed via gateway");
      }

      const data = await aiResponse.json();
      const rawText = data.choices?.[0]?.message?.content ?? "";
      const result = parseVerificationResult(rawText, hasFileContent);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("No AI provider available");
  } catch (e) {
    console.error("verify-document error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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

function parseVerificationResult(rawText: string, ocrPerformed: boolean): Record<string, unknown> {
  try {
    // Strip markdown code fences if present
    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!ocrPerformed) {
      return createReviewResult(
        "Actual OCR was not performed for this upload.",
        ["Re-upload a supported document image and try again."],
      );
    }

    if (!["VERIFIED", "NEEDS_REVIEW", "REJECTED"].includes(parsed.status)) {
      parsed.status = "NEEDS_REVIEW";
    }

    parsed.confidence = typeof parsed.confidence === "number" ? Math.max(0, Math.min(100, parsed.confidence)) : 0;
    parsed.message = typeof parsed.message === "string" && parsed.message.trim()
      ? parsed.message
      : "Document needs manual review.";
    parsed.extractedText = typeof parsed.extractedText === "string" && parsed.extractedText.trim()
      ? parsed.extractedText
      : "No OCR text extracted";
    parsed.detectedFields = Array.isArray(parsed.detectedFields) ? parsed.detectedFields : [];
    parsed.missingFields = Array.isArray(parsed.missingFields) ? parsed.missingFields : [];
    parsed.tips = Array.isArray(parsed.tips) ? parsed.tips : [];
    parsed.ocrPerformed = true;
    return parsed;
  } catch {
    // Fallback if JSON parsing fails
    return {
      status: "NEEDS_REVIEW",
      confidence: 50,
      message: rawText.slice(0, 300) || "Could not parse verification result. Please review manually.",
      extractedText: "Parse error",
      detectedFields: [],
      missingFields: [],
      tips: ["Please re-upload the document and try again.", "Ensure the document is clear and fully visible."],
      ocrPerformed,
    };
  }
}
