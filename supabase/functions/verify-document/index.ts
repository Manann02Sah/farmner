import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    parsed.message =
      typeof parsed.message === "string" && parsed.message.trim() ? parsed.message : "Document needs manual review.";
    parsed.extractedText =
      typeof parsed.extractedText === "string" && parsed.extractedText.trim()
        ? parsed.extractedText
        : "No OCR text extracted";
    parsed.detectedFields = Array.isArray(parsed.detectedFields) ? parsed.detectedFields : [];
    parsed.missingFields = Array.isArray(parsed.missingFields) ? parsed.missingFields : [];
    parsed.tips = Array.isArray(parsed.tips) ? parsed.tips : [];
    parsed.ocrPerformed = true;
    return parsed;
  } catch {
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured. Set it in Supabase secrets.");
    }

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
        if (prefersJson) throw jsonError;

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
    const extractionRule =
      DOC_EXTRACTION_RULES[documentType] ||
      "Look for key identifying information, official stamps/seals, dates, and reference numbers.";

    if (!hasFileContent || !fileBase64) {
      return jsonResponse(
        createReviewResult(
          language === "hi"
            ? "वास्तविक OCR स्कैन शुरू नहीं हो सका क्योंकि फ़ाइल सामग्री पढ़ी नहीं जा सकी।"
            : "Actual OCR could not start because the uploaded file content could not be read.",
          language === "hi"
            ? ["फ़ाइल को फिर से अपलोड करें।", "PDF, JPG, JPEG, PNG, या WEBP फ़ाइल का उपयोग करें।"]
            : ["Re-upload the file.", "Use a PDF, JPG, JPEG, PNG, or WEBP document."],
        ),
      );
    }

    const isImage = fileMimeType.startsWith("image/");
    const isPdf = fileMimeType === "application/pdf";

    if (!isImage && !isPdf) {
      return jsonResponse(
        createReviewResult(
          language === "hi"
            ? "यह फ़ाइल प्रकार वास्तविक OCR स्कैन के लिए समर्थित नहीं है। कृपया PDF, JPG, JPEG, PNG, या WEBP अपलोड करें।"
            : "This file type is not supported for actual OCR scanning. Please upload PDF, JPG, JPEG, PNG, or WEBP.",
          language === "hi"
            ? ["समर्थित फ़ॉर्मैट में फ़िर से अपलोड करें।"]
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
- message: string
- extractedText: string
- detectedFields: array of strings
- missingFields: array of strings
- tips: array of strings
- ocrPerformed: boolean

Be strict: VERIFIED only if all key required fields are clearly present. NEEDS_REVIEW if partially legible or minor issues. REJECTED if wrong document type, heavily tampered, or illegible.`;

    const analysisPrompt = `Analyze the uploaded document for the scheme "${schemeTitle}".

Expected document type: "${documentType}"
Extraction guide: ${extractionRule}

Rules:
1. Perform OCR on the actual uploaded document content.
2. Do not infer correctness from the expected document type or file name alone.
3. Confirm whether the visible content really matches "${documentType}".
4. Extract all visible text that matters for verification.
5. Identify present fields, missing fields, seals, signatures, dates, numbers, and authenticity markers.
6. If the document is unclear, incomplete, blurry, or mismatched, return NEEDS_REVIEW or REJECTED.

Respond only in ${lang}.`;

    const aiResponse = await fetch(
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
                { text: `${systemPrompt}\n\n${analysisPrompt}` },
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

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Gemini verification error:", aiResponse.status, errorText);
      throw new Error("Verification failed via Gemini");
    }

    const data = await aiResponse.json();
    const rawText = String(
      data.candidates?.[0]?.content?.parts
        ?.map((part: Record<string, unknown>) => (typeof part.text === "string" ? part.text : ""))
        .join("") ?? "",
    );

    const result = parseVerificationResult(rawText, hasFileContent);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-document error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
