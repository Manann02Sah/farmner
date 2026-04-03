import { useMemo, useRef, useState } from "react";
import { ArrowRightLeft, CheckCircle2, Download, FileText, Languages, Loader2, RefreshCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { invokeJsonEdgeFunction } from "@/lib/edgeFunctions";

const CONVERT_DOCUMENT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/convert-document`;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SUPPORTED_FORMATS = ".pdf,.jpg,.jpeg,.png,.webp";
const MAX_FILE_SIZE_MB = 15;

type ConversionDirection = "en-to-hi" | "hi-to-en";

interface ConversionResult {
  translatedText: string;
  originalText?: string;
  detectedSourceLanguage?: string;
  warnings?: string[];
  ocrPerformed?: boolean;
}

const readFileAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const DocumentConverter = () => {
  const { language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [direction, setDirection] = useState<ConversionDirection>("en-to-hi");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);

  const copy = useMemo(() => {
    if (language === "hi") {
      return {
        title: "दस्तावेज़ कन्वर्टर",
        subtitle: "PDF या साफ़ दस्तावेज़ स्कैन अपलोड करें और OCR टेक्स्ट को हिंदी और अंग्रेज़ी के बीच बदलें।",
        uploadTitle: selectedFile ? "दूसरा दस्तावेज़ चुनें" : "PDF या दस्तावेज़ स्कैन अपलोड करें",
        maxSize: `अधिकतम आकार ${MAX_FILE_SIZE_MB}MB`,
        noFile: "अभी कोई दस्तावेज़ नहीं चुना गया है",
        chooseFirst: "कन्वर्ज़न शुरू करने से पहले दस्तावेज़ चुनें।",
        pickSource: "OCR और अनुवाद शुरू करने के लिए स्रोत दस्तावेज़ चुनें।",
        clear: "हटाएँ",
        convert: "दस्तावेज़ कन्वर्ट करें",
        converting: "कन्वर्ट हो रहा है...",
        download: "टेक्स्ट डाउनलोड करें",
        outputHint: "दस्तावेज़ पढ़ने के बाद OCR टेक्स्ट का अनुवाद किया जाता है।",
        ocrComplete: "OCR पूरा",
        detectedSource: "पहचानी गई स्रोत भाषा",
        reviewNotes: "समीक्षा नोट्स",
        ocrPreview: "OCR टेक्स्ट प्रीव्यू",
        emptyTitle: "अनुवादित दस्तावेज़ का टेक्स्ट यहाँ दिखेगा।",
        emptyDesc: "फ़ाइल चुनें और आउटपुट पाने के लिए कन्वर्ज़न शुरू करें।",
        enToHi: "अंग्रेज़ी से हिंदी",
        hiToEn: "हिंदी से अंग्रेज़ी",
        enToHiHelper: "अंग्रेज़ी PDF या स्कैन अपलोड करें और हिंदी अनुवाद पाएँ।",
        hiToEnHelper: "हिंदी PDF या स्कैन अपलोड करें और अंग्रेज़ी अनुवाद पाएँ।",
        hindiOutput: "हिंदी अनुवाद",
        englishOutput: "अंग्रेज़ी अनुवाद",
        failed: "दस्तावेज़ कन्वर्ज़न विफल रहा।",
        noText: "दस्तावेज़ कन्वर्ज़न सेवा ने अनुवादित टेक्स्ट वापस नहीं दिया।",
      };
    }

    return {
      title: "Document Converter",
      subtitle: "Upload a PDF or clear document scan and convert the OCR text between Hindi and English.",
      uploadTitle: selectedFile ? "Choose a different document" : "Upload a PDF or document scan",
      maxSize: `Maximum size ${MAX_FILE_SIZE_MB}MB`,
      noFile: "No document selected yet",
      chooseFirst: "Choose a document before starting the conversion.",
      pickSource: "Pick a source document to begin OCR and translation.",
      clear: "Clear",
      convert: "Convert document",
      converting: "Converting...",
      download: "Download text",
      outputHint: "OCR output is translated after the document is read.",
      ocrComplete: "OCR complete",
      detectedSource: "Detected source language",
      reviewNotes: "Review notes",
      ocrPreview: "OCR text preview",
      emptyTitle: "Your translated document text will appear here.",
      emptyDesc: "Choose a file and start the conversion to generate the translated output.",
      enToHi: "English to Hindi",
      hiToEn: "Hindi to English",
      enToHiHelper: "Upload an English PDF or scan and get a Hindi translation.",
      hiToEnHelper: "Upload a Hindi PDF or scan and get an English translation.",
      hindiOutput: "Hindi translation",
      englishOutput: "English translation",
      failed: "Document conversion failed.",
      noText: "The document conversion service did not return translated text.",
    };
  }, [language, selectedFile]);

  const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? PUBLISHABLE_KEY;

    return {
      apikey: PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    };
  };

  const directionCopy = direction === "en-to-hi"
    ? {
        label: copy.enToHi,
        helper: copy.enToHiHelper,
        sourceLanguage: "en" as const,
        targetLanguage: "hi" as const,
        outputLabel: copy.hindiOutput,
      }
    : {
        label: copy.hiToEn,
        helper: copy.hiToEnHelper,
        sourceLanguage: "hi" as const,
        targetLanguage: "en" as const,
        outputLabel: copy.englishOutput,
      };

  const resetResult = () => setResult(null);

  const handleFileSelect = (file: File) => {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(language === "hi" ? `फ़ाइल ${MAX_FILE_SIZE_MB}MB से छोटी होनी चाहिए` : `File must be under ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setSelectedFile(file);
    resetResult();
  };

  const handleConvert = async () => {
    if (!selectedFile) {
      toast.error(copy.chooseFirst);
      return;
    }

    setIsConverting(true);
    resetResult();

    try {
      const fileBase64 = await readFileAsBase64(selectedFile);
      const data = await invokeJsonEdgeFunction<ConversionResult>(
        "convert-document",
        CONVERT_DOCUMENT_URL,
        {
          fileName: selectedFile.name,
          fileBase64,
          fileMimeType: selectedFile.type || "application/pdf",
          sourceLanguage: directionCopy.sourceLanguage,
          targetLanguage: directionCopy.targetLanguage,
        },
        getAuthHeaders,
        copy.failed,
      );

      if (typeof data.translatedText !== "string" || !data.translatedText.trim()) {
        throw new Error(copy.noText);
      }

      setResult({
        translatedText: data.translatedText,
        originalText: data.originalText,
        detectedSourceLanguage: data.detectedSourceLanguage,
        warnings: Array.isArray(data.warnings) ? data.warnings : [],
        ocrPerformed: data.ocrPerformed,
      });
    } catch (error) {
      toast.error(error instanceof Error && error.message.trim() ? error.message : copy.failed);
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (!result?.translatedText) {
      return;
    }

    const baseName = selectedFile?.name.replace(/\.[^.]+$/, "") || "translated-document";
    const fileName = `${baseName}-${directionCopy.targetLanguage}.txt`;
    const blob = new Blob([result.translatedText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="bg-surface-container rounded-3xl p-6 md:p-8 ghost-border">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Languages className="w-5 h-5 text-primary" />
            <h2 className="font-headline font-bold text-2xl">{copy.title}</h2>
          </div>
          <p className="text-sm text-on-surface-variant max-w-2xl">{copy.subtitle}</p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-surface-highest p-1">
          {(["en-to-hi", "hi-to-en"] as ConversionDirection[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setDirection(value);
                resetResult();
              }}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                direction === value ? "bg-primary text-primary-foreground" : "text-on-surface-variant hover:text-foreground"
              }`}
            >
              {value === "en-to-hi" ? copy.enToHi : copy.hiToEn}
            </button>
          ))}
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.1fr_1fr] gap-6">
        <div className="space-y-4">
          <div className="rounded-2xl bg-surface-high p-5">
            <div className="flex items-center gap-2 mb-2">
              <ArrowRightLeft className="w-4 h-4 text-accent" />
              <p className="text-sm font-semibold">{directionCopy.label}</p>
            </div>
            <p className="text-sm text-on-surface-variant">{directionCopy.helper}</p>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-2xl border-2 border-dashed border-outline-variant/30 p-8 text-center hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            <Upload className="w-8 h-8 text-primary mx-auto mb-3" />
            <p className="font-medium text-sm mb-1">{copy.uploadTitle}</p>
            <p className="text-xs text-on-surface-variant uppercase tracking-wider">PDF, JPG, JPEG, PNG, WEBP</p>
            <p className="text-xs text-on-surface-variant mt-2">{copy.maxSize}</p>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept={SUPPORTED_FORMATS}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                handleFileSelect(file);
              }
              event.target.value = "";
            }}
          />

          <div className="rounded-2xl bg-surface-highest/70 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{selectedFile ? selectedFile.name : copy.noFile}</p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : copy.pickSource}
                  </p>
                </div>
              </div>

              {selectedFile && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    resetResult();
                  }}
                  className="text-xs text-on-surface-variant hover:text-foreground"
                >
                  {copy.clear}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleConvert}
              disabled={!selectedFile || isConverting}
              className="gradient-primary text-primary-foreground font-headline font-bold px-6 py-3 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {isConverting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              {isConverting ? copy.converting : copy.convert}
            </button>

            {result?.translatedText && (
              <button
                type="button"
                onClick={handleDownload}
                className="ghost-border px-5 py-3 rounded-xl text-sm font-medium text-on-surface-variant hover:text-foreground inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {copy.download}
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-surface-high p-5 min-h-[24rem]">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-sm font-semibold">{directionCopy.outputLabel}</p>
              <p className="text-xs text-on-surface-variant">{copy.outputHint}</p>
            </div>
            {result?.ocrPerformed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                <CheckCircle2 className="w-3 h-3" />
                {copy.ocrComplete}
              </span>
            )}
          </div>

          {result?.translatedText ? (
            <div className="space-y-4">
              {result.detectedSourceLanguage && (
                <p className="text-xs text-on-surface-variant">
                  {copy.detectedSource}: <span className="text-foreground font-medium">{result.detectedSourceLanguage}</span>
                </p>
              )}

              <div className="rounded-2xl bg-background/60 p-4 max-h-[20rem] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{result.translatedText}</pre>
              </div>

              {result.warnings && result.warnings.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-yellow-500 mb-2">{copy.reviewNotes}</p>
                  <ul className="space-y-2">
                    {result.warnings.map((warning, index) => (
                      <li key={`${warning}-${index}`} className="text-xs text-on-surface-variant">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.originalText && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-on-surface-variant mb-2">{copy.ocrPreview}</p>
                  <div className="rounded-2xl bg-background/40 p-4 max-h-40 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-xs leading-relaxed font-sans text-on-surface-variant">
                      {result.originalText}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center">
              <div>
                <Languages className="w-10 h-10 text-on-surface-variant mx-auto mb-3" />
                <p className="font-medium mb-1">{copy.emptyTitle}</p>
                <p className="text-sm text-on-surface-variant">{copy.emptyDesc}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default DocumentConverter;
