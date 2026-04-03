const MYMEMORY_URL = "https://api.mymemory.translated.net/get";

type LanguageCode = "en" | "hi";
type ProgressStage = "extracting" | "translating" | "generating";

type LocalTranslationOptions = {
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  onProgress?: (stage: ProgressStage, progress: number, message: string) => void;
};

type LocalTranslationResult = {
  originalText: string;
  translatedText: string;
  translatedPdfBlob: Blob;
  detectedSourceLanguage: string;
  warnings: string[];
};

let cachedDevanagariFontBase64: string | null = null;
let pdfJsPromise: Promise<any> | null = null;
let jsPdfPromise: Promise<any> | null = null;

const getPdfJs = async () => {
  if (!pdfJsPromise) {
    pdfJsPromise = import("pdfjs-dist").then((module) => {
      module.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      return module;
    });
  }

  return pdfJsPromise;
};

const getJsPdf = async () => {
  if (!jsPdfPromise) {
    jsPdfPromise = import("jspdf").then((module) => module.default);
  }

  return jsPdfPromise;
};

const toLanguageName = (language: LanguageCode) => (language === "hi" ? "Hindi" : "English");

const chunkText = (text: string, maxLen = 450): string[] => {
  if (!text.trim()) return [""];

  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) || [text];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + sentence).length > maxLen && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length ? chunks : [""];
};

const emitProgress = (
  options: LocalTranslationOptions,
  stage: ProgressStage,
  progress: number,
  message: string,
) => {
  options.onProgress?.(stage, Math.max(0, Math.min(100, Math.round(progress))), message);
};

const extractTextPages = async (
  file: File,
  options: LocalTranslationOptions,
): Promise<string[]> => {
  emitProgress(options, "extracting", 8, "Reading PDF pages...");
  const pdfjsLib = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => ((item as { str?: string }).str ?? ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push(text);
  }

  emitProgress(options, "extracting", 18, "Text extraction complete.");
  return pages;
};

const translateChunkedText = async (
  text: string,
  sourceLanguage: LanguageCode,
  targetLanguage: LanguageCode,
): Promise<string> => {
  if (!text.trim()) return "";

  const chunks = chunkText(text);
  const translated: string[] = [];

  for (let i = 0; i < chunks.length; i += 1) {
    const params = new URLSearchParams({
      q: chunks[i],
      langpair: `${sourceLanguage}|${targetLanguage}`,
    });

    try {
      const response = await fetch(`${MYMEMORY_URL}?${params.toString()}`);
      const data = await response.json();
      translated.push(data.responseData?.translatedText || chunks[i]);
    } catch {
      translated.push(chunks[i]);
    }

    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  return translated.join(" ").trim();
};

const loadDevanagariFont = async (doc: any) => {
  if (!cachedDevanagariFontBase64) {
    const fontUrls = [
      "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosansdevanagari/NotoSansDevanagari%5Bwdth%2Cwght%5D.ttf",
      "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/unhinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf",
      "https://rawcdn.githack.com/googlefonts/noto-fonts/main/unhinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf",
    ];

    let fontBuffer: ArrayBuffer | null = null;

    for (const url of fontUrls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          fontBuffer = await response.arrayBuffer();
          break;
        }
      } catch {
        // Try the next URL.
      }
    }

    if (!fontBuffer) {
      throw new Error("Could not load Hindi font for translated PDF generation.");
    }

    const bytes = new Uint8Array(fontBuffer);
    const chunkSize = 8192;
    let binary = "";

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }

    cachedDevanagariFontBase64 = btoa(binary);
  }

  doc.addFileToVFS("NotoSansDevanagari.ttf", cachedDevanagariFontBase64);
  doc.addFont("NotoSansDevanagari.ttf", "NotoSansDevanagari", "normal");
};

const generateTranslatedPdf = async (
  pages: string[],
  targetLanguage: LanguageCode,
): Promise<Blob> => {
  const jsPDF = await getJsPdf();
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  if (targetLanguage === "hi") {
    await loadDevanagariFont(doc);
    doc.setFont("NotoSansDevanagari", "normal");
  } else {
    doc.setFont("helvetica", "normal");
  }

  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  const maxY = pageHeight - margin;
  const lineHeight = 8;

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    if (pageIndex > 0) {
      doc.addPage();
    }

    doc.setFontSize(12);
    const lines = doc.splitTextToSize(pages[pageIndex] || "", maxWidth);
    let y = margin;

    for (const line of lines) {
      if (y + lineHeight > maxY) {
        doc.addPage();
        y = margin;
      }

      doc.text(line, margin, y);
      y += lineHeight;
    }
  }

  return doc.output("blob");
};

export async function translatePdfLocally(
  file: File,
  options: LocalTranslationOptions,
): Promise<LocalTranslationResult> {
  const pages = await extractTextPages(file, options);
  const nonEmptyPages = pages.filter((page) => page.trim().length > 0);

  if (nonEmptyPages.length === 0) {
    throw new Error(
      "The PDF appears image-based. Local text extraction could not read any text from the file.",
    );
  }

  const translatedPages: string[] = [];
  const totalPages = pages.length;

  for (let i = 0; i < totalPages; i += 1) {
    const currentPage = i + 1;
    const pageText = pages[i] || "";
    const translatedPage = await translateChunkedText(
      pageText,
      options.sourceLanguage,
      options.targetLanguage,
    );
    translatedPages.push(translatedPage);

    const progress = 20 + (currentPage / totalPages) * 65;
    emitProgress(
      options,
      "translating",
      progress,
      `Translating page ${currentPage} of ${totalPages}...`,
    );
  }

  emitProgress(options, "generating", 90, "Generating translated PDF...");
  const translatedPdfBlob = await generateTranslatedPdf(
    translatedPages,
    options.targetLanguage,
  );

  emitProgress(options, "generating", 100, "Translation complete.");

  return {
    originalText: pages.join("\n\n").trim(),
    translatedText: translatedPages.join("\n\n").trim(),
    translatedPdfBlob,
    detectedSourceLanguage: toLanguageName(options.sourceLanguage),
    warnings: [
      "Used local PDF translation fallback. For scanned PDFs, server OCR gives better results.",
    ],
  };
}
