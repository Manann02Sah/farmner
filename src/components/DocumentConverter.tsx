import { useMemo, useRef, useState } from "react";
import {
  ArrowRightLeft,
  CheckCircle2,
  Download,
  FileText,
  Languages,
  Loader2,
  RefreshCcw,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { invokeJsonEdgeFunction } from "@/lib/edgeFunctions";
import { translateImageLocally, translatePdfLocally } from "@/lib/localPdfTranslator";

const CONVERT_DOCUMENT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/convert-document`;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SUPPORTED_FORMATS = ".pdf,.jpg,.jpeg,.png,.webp";
const MAX_FILE_SIZE_MB = 15;

type ConversionDirection = "en-to-hi" | "hi-to-en";
type LanguageCode = "en" | "hi";

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
  const [localProgress, setLocalProgress] = useState(0);
  const [localStatus, setLocalStatus] = useState("");
  const [translatedPdfBlob, setTranslatedPdfBlob] = useState<Blob | null>(null);

  const copy = useMemo(() => {
    if (language === "hi") {
      return {
        title: "\u0926\u0938\u094d\u0924\u093e\u0935\u0947\u091c\u093c \u0915\u0928\u094d\u0935\u0930\u094d\u091f\u0930",
        subtitle:
          "PDF \u092f\u093e \u0938\u094d\u0915\u0948\u0928 \u0905\u092a\u0932\u094b\u0921 \u0915\u0930\u0947\u0902 \u0914\u0930 OCR \u091f\u0947\u0915\u094d\u0938\u094d\u091f \u0915\u094b \u0939\u093f\u0902\u0926\u0940/\u0905\u0902\u0917\u094d\u0930\u0947\u091c\u093c\u0940 \u092e\u0947\u0902 \u092c\u0926\u0932\u0947\u0902\u0964",
        uploadTitle: selectedFile
          ? "\u0926\u0942\u0938\u0930\u093e \u0926\u0938\u094d\u0924\u093e\u0935\u0947\u091c\u093c \u091a\u0941\u0928\u0947\u0902"
          : "PDF \u092f\u093e \u0938\u094d\u0915\u0948\u0928 \u0905\u092a\u0932\u094b\u0921 \u0915\u0930\u0947\u0902",
        maxSize: `\u0905\u0927\u093f\u0915\u0924\u092e \u0906\u0915\u093e\u0930 ${MAX_FILE_SIZE_MB}MB`,
        noFile: "\u0905\u092d\u0940 \u0915\u094b\u0908 \u0926\u0938\u094d\u0924\u093e\u0935\u0947\u091c\u093c \u0928\u0939\u0940\u0902 \u091a\u0941\u0928\u093e \u0917\u092f\u093e",
        chooseFirst:
          "\u0915\u0928\u094d\u0935\u0930\u094d\u091c\u0928 \u0936\u0941\u0930\u0942 \u0915\u0930\u0928\u0947 \u0938\u0947 \u092a\u0939\u0932\u0947 \u0926\u0938\u094d\u0924\u093e\u0935\u0947\u091c\u093c \u091a\u0941\u0928\u0947\u0902\u0964",
        pickSource:
          "OCR \u0914\u0930 \u0905\u0928\u0941\u0935\u093e\u0926 \u0936\u0941\u0930\u0942 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u0938\u094d\u0930\u094b\u0924 \u0926\u0938\u094d\u0924\u093e\u0935\u0947\u091c\u093c \u091a\u0941\u0928\u0947\u0902\u0964",
        clear: "\u0939\u091f\u093e\u090f\u0901",
        convert: "\u0926\u0938\u094d\u0924\u093e\u0935\u0947\u091c\u093c \u0915\u0928\u094d\u0935\u0930\u094d\u091f \u0915\u0930\u0947\u0902",
        converting: "\u0915\u0928\u094d\u0935\u0930\u094d\u091f \u0939\u094b \u0930\u0939\u093e \u0939\u0948...",
        downloadText: "\u091f\u0947\u0915\u094d\u0938\u094d\u091f \u0921\u093e\u0909\u0928\u0932\u094b\u0921 \u0915\u0930\u0947\u0902",
        downloadPdf: "\u0905\u0928\u0941\u0935\u093e\u0926\u093f\u0924 PDF \u0921\u093e\u0909\u0928\u0932\u094b\u0921 \u0915\u0930\u0947\u0902",
        outputHint:
          "\u0926\u0938\u094d\u0924\u093e\u0935\u0947\u091c\u093c \u092a\u0922\u093c\u0928\u0947 \u0915\u0947 \u092c\u093e\u0926 OCR \u091f\u0947\u0915\u094d\u0938\u094d\u091f \u0915\u093e \u0905\u0928\u0941\u0935\u093e\u0926 \u0915\u093f\u092f\u093e \u091c\u093e\u0924\u093e \u0939\u0948\u0964",
        ocrComplete: "OCR \u092a\u0942\u0930\u093e",
        detectedSource: "\u092a\u0939\u091a\u093e\u0928\u0940 \u0917\u0908 \u0938\u094d\u0930\u094b\u0924 \u092d\u093e\u0937\u093e",
        reviewNotes: "\u0938\u092e\u0940\u0915\u094d\u0937\u093e \u0928\u094b\u091f\u094d\u0938",
        ocrPreview: "OCR \u091f\u0947\u0915\u094d\u0938\u094d\u091f \u092a\u094d\u0930\u0940\u0935\u094d\u092f\u0942",
        emptyTitle:
          "\u0905\u0928\u0941\u0935\u093e\u0926\u093f\u0924 \u0926\u0938\u094d\u0924\u093e\u0935\u0947\u091c\u093c \u0915\u093e \u091f\u0947\u0915\u094d\u0938\u094d\u091f \u092f\u0939\u093e\u0901 \u0926\u093f\u0916\u0947\u0917\u093e\u0964",
        emptyDesc:
          "\u092b\u093e\u0907\u0932 \u091a\u0941\u0928\u0947\u0902 \u0914\u0930 \u0915\u0928\u094d\u0935\u0930\u094d\u091c\u0928 \u0936\u0941\u0930\u0942 \u0915\u0930\u0915\u0947 \u0906\u0909\u091f\u092a\u0941\u091f \u092a\u093e\u090f\u0901\u0964",
        enToHi: "\u0905\u0902\u0917\u094d\u0930\u0947\u091c\u093c\u0940 \u0938\u0947 \u0939\u093f\u0902\u0926\u0940",
        hiToEn: "\u0939\u093f\u0902\u0926\u0940 \u0938\u0947 \u0905\u0902\u0917\u094d\u0930\u0947\u091c\u093c\u0940",
        enToHiHelper:
          "\u0905\u0902\u0917\u094d\u0930\u0947\u091c\u093c\u0940 PDF \u092f\u093e \u0938\u094d\u0915\u0948\u0928 \u0905\u092a\u0932\u094b\u0921 \u0915\u0930\u0947\u0902 \u0914\u0930 \u0939\u093f\u0902\u0926\u0940 \u0905\u0928\u0941\u0935\u093e\u0926 \u092a\u093e\u090f\u0901\u0964",
        hiToEnHelper:
          "\u0939\u093f\u0902\u0926\u0940 PDF \u092f\u093e \u0938\u094d\u0915\u0948\u0928 \u0905\u092a\u0932\u094b\u0921 \u0915\u0930\u0947\u0902 \u0914\u0930 \u0905\u0902\u0917\u094d\u0930\u0947\u091c\u093c\u0940 \u0905\u0928\u0941\u0935\u093e\u0926 \u092a\u093e\u090f\u0901\u0964",
        hindiOutput: "\u0939\u093f\u0902\u0926\u0940 \u0905\u0928\u0941\u0935\u093e\u0926",
        englishOutput: "\u0905\u0902\u0917\u094d\u0930\u0947\u091c\u093c\u0940 \u0905\u0928\u0941\u0935\u093e\u0926",
        failed: "\u0926\u0938\u094d\u0924\u093e\u0935\u0947\u091c\u093c \u0915\u0928\u094d\u0935\u0930\u094d\u091c\u0928 \u0935\u093f\u092b\u0932 \u0930\u0939\u093e\u0964",
        noText:
          "\u0926\u0938\u094d\u0924\u093e\u0935\u0947\u091c\u093c \u0915\u0928\u094d\u0935\u0930\u094d\u091c\u0928 \u0938\u0947\u0935\u093e \u0928\u0947 \u0905\u0928\u0941\u0935\u093e\u0926\u093f\u0924 \u091f\u0947\u0915\u094d\u0938\u094d\u091f \u0935\u093e\u092a\u0938 \u0928\u0939\u0940\u0902 \u0926\u093f\u092f\u093e\u0964",
        localFallback:
          "\u0938\u0930\u094d\u0935\u0930 \u0905\u0928\u0941\u0935\u093e\u0926 \u0905\u0938\u092b\u0932 \u0930\u0939\u093e, \u0905\u092c \u0932\u094b\u0915\u0932 PDF \u092e\u0949\u0921\u0932 \u0938\u0947 \u0915\u0928\u094d\u0935\u0930\u094d\u091f \u0915\u0930 \u0930\u0939\u0947 \u0939\u0948\u0902...",
        localFallbackDone:
          "\u0932\u094b\u0915\u0932 PDF \u092e\u0949\u0921\u0932 \u0938\u0947 \u0905\u0928\u0941\u0935\u093e\u0926 \u092a\u0942\u0930\u093e \u0939\u094b \u0917\u092f\u093e\u0964",
        localImageFallback:
          "\u0938\u0930\u094d\u0935\u0930 image OCR \u0905\u0938\u092b\u0932 \u0930\u0939\u093e, \u0905\u092c \u0932\u094b\u0915\u0932 image OCR \u0938\u0947 \u0915\u0928\u094d\u0935\u0930\u094d\u091f \u0915\u0930 \u0930\u0939\u0947 \u0939\u0948\u0902...",
        localImageFallbackDone:
          "\u0932\u094b\u0915\u0932 image OCR \u0938\u0947 \u0905\u0928\u0941\u0935\u093e\u0926 \u092a\u0942\u0930\u093e \u0939\u094b \u0917\u092f\u093e\u0964",
        fallbackWarning:
          "\u0938\u094d\u0915\u0948\u0928 PDF \u0915\u0947 \u0932\u093f\u090f \u0938\u0930\u094d\u0935\u0930 OCR \u0906\u092e \u0924\u094c\u0930 \u092a\u0930 \u092c\u0947\u0939\u0924\u0930 \u0939\u0948\u0964",
      };
    }

    return {
      title: "Document Converter",
      subtitle:
        "Upload a PDF or clear document scan and convert the OCR text between Hindi and English.",
      uploadTitle: selectedFile ? "Choose a different document" : "Upload a PDF or document scan",
      maxSize: `Maximum size ${MAX_FILE_SIZE_MB}MB`,
      noFile: "No document selected yet",
      chooseFirst: "Choose a document before starting the conversion.",
      pickSource: "Pick a source document to begin OCR and translation.",
      clear: "Clear",
      convert: "Convert document",
      converting: "Converting...",
      downloadText: "Download text",
      downloadPdf: "Download translated PDF",
      outputHint: "OCR output is translated after the document is read.",
      ocrComplete: "OCR complete",
      detectedSource: "Detected source language",
      reviewNotes: "Review notes",
      ocrPreview: "OCR text preview",
      emptyTitle: "Your translated document text will appear here.",
      emptyDesc: "Choose a file and start conversion to generate translated output.",
      enToHi: "English to Hindi",
      hiToEn: "Hindi to English",
      enToHiHelper: "Upload an English PDF or scan and get a Hindi translation.",
      hiToEnHelper: "Upload a Hindi PDF or scan and get an English translation.",
      hindiOutput: "Hindi translation",
      englishOutput: "English translation",
      failed: "Document conversion failed.",
      noText: "The document conversion service did not return translated text.",
      localFallback: "Server translation failed. Switching to local PDF translator model...",
      localFallbackDone: "Local PDF translation completed.",
      localImageFallback: "Server image OCR failed. Switching to local image OCR...",
      localImageFallbackDone: "Local image OCR translation completed.",
      fallbackWarning: "For scanned PDFs, server OCR usually gives better results.",
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
        sourceLanguage: "en" as LanguageCode,
        targetLanguage: "hi" as LanguageCode,
        outputLabel: copy.hindiOutput,
      }
    : {
        label: copy.hiToEn,
        helper: copy.hiToEnHelper,
        sourceLanguage: "hi" as LanguageCode,
        targetLanguage: "en" as LanguageCode,
        outputLabel: copy.englishOutput,
      };

  const resetResult = () => {
    setResult(null);
    setLocalProgress(0);
    setLocalStatus("");
    setTranslatedPdfBlob(null);
  };

  const handleFileSelect = (file: File) => {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(
        language === "hi"
          ? `\u092b\u093e\u0907\u0932 ${MAX_FILE_SIZE_MB}MB \u0938\u0947 \u091b\u094b\u091f\u0940 \u0939\u094b\u0928\u0940 \u091a\u093e\u0939\u093f\u090f`
          : `File must be under ${MAX_FILE_SIZE_MB}MB.`,
      );
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

    const isPdf =
      selectedFile.type === "application/pdf" ||
      selectedFile.name.toLowerCase().endsWith(".pdf");
    const isImage = selectedFile.type.startsWith("image/");

    const applyResult = (data: ConversionResult, pdfBlob: Blob | null = null) => {
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
      setTranslatedPdfBlob(pdfBlob);
    };

    try {
      if (isPdf) {
        try {
          const localResult = await translatePdfLocally(selectedFile, {
            sourceLanguage: directionCopy.sourceLanguage,
            targetLanguage: directionCopy.targetLanguage,
            onProgress: (_stage, progress, message) => {
              setLocalProgress(progress);
              setLocalStatus(message);
            },
          });

          applyResult(
            {
              translatedText: localResult.translatedText,
              originalText: localResult.originalText,
              detectedSourceLanguage: localResult.detectedSourceLanguage,
              warnings: localResult.warnings,
              ocrPerformed: true,
            },
            localResult.translatedPdfBlob,
          );
          toast.error(copy.localFallbackDone);
          return;
        } catch (localPdfError) {
          console.warn("Local PDF translation failed, retrying server OCR path", localPdfError);
          setLocalProgress(0);
          setLocalStatus("");
        }
      }

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

      applyResult(data);
      return;
    } catch (serverError) {
      if (!isPdf && !isImage) {
        toast.error(
          serverError instanceof Error && serverError.message.trim()
            ? serverError.message
            : copy.failed,
        );
        setIsConverting(false);
        return;
      }

      try {
        if (isPdf) {
          toast.error(copy.localFallback);
          const localResult = await translatePdfLocally(selectedFile, {
            sourceLanguage: directionCopy.sourceLanguage,
            targetLanguage: directionCopy.targetLanguage,
            onProgress: (_stage, progress, message) => {
              setLocalProgress(progress);
              setLocalStatus(message);
            },
          });

          applyResult(
            {
              translatedText: localResult.translatedText,
              originalText: localResult.originalText,
              detectedSourceLanguage: localResult.detectedSourceLanguage,
              warnings: localResult.warnings,
              ocrPerformed: true,
            },
            localResult.translatedPdfBlob,
          );
          toast.error(copy.localFallbackDone);
          return;
        }

        toast.error(copy.localImageFallback);
        const localImageResult = await translateImageLocally(selectedFile, {
          sourceLanguage: directionCopy.sourceLanguage,
          targetLanguage: directionCopy.targetLanguage,
          onProgress: (_stage, progress, message) => {
            setLocalProgress(progress);
            setLocalStatus(message);
          },
        });

        applyResult(
          {
            translatedText: localImageResult.translatedText,
            originalText: localImageResult.originalText,
            detectedSourceLanguage: localImageResult.detectedSourceLanguage,
            warnings: localImageResult.warnings,
            ocrPerformed: true,
          },
          null,
        );
        toast.error(copy.localImageFallbackDone);
      } catch (localError) {
        toast.error(
          localError instanceof Error && localError.message.trim()
            ? localError.message
            : (serverError instanceof Error && serverError.message.trim()
              ? serverError.message
              : copy.failed),
        );
      }
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownloadText = () => {
    if (!result?.translatedText) return;

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

  const handleDownloadPdf = () => {
    if (!translatedPdfBlob) return;

    const baseName = selectedFile?.name.replace(/\.[^.]+$/, "") || "translated-document";
    const fileName = `${baseName}-${directionCopy.targetLanguage}.pdf`;
    const url = URL.createObjectURL(translatedPdfBlob);
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
                direction === value
                  ? "bg-primary text-primary-foreground"
                  : "text-on-surface-variant hover:text-foreground"
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
            <p className="text-xs text-on-surface-variant uppercase tracking-wider">
              PDF, JPG, JPEG, PNG, WEBP
            </p>
            <p className="text-xs text-on-surface-variant mt-2">{copy.maxSize}</p>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept={SUPPORTED_FORMATS}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleFileSelect(file);
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
                    {selectedFile
                      ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                      : copy.pickSource}
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
              {isConverting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCcw className="w-4 h-4" />
              )}
              {isConverting ? copy.converting : copy.convert}
            </button>

            {result?.translatedText && (
              <button
                type="button"
                onClick={handleDownloadText}
                className="ghost-border px-5 py-3 rounded-xl text-sm font-medium text-on-surface-variant hover:text-foreground inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {copy.downloadText}
              </button>
            )}

            {translatedPdfBlob && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="ghost-border px-5 py-3 rounded-xl text-sm font-medium text-on-surface-variant hover:text-foreground inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {copy.downloadPdf}
              </button>
            )}
          </div>

          {isConverting && localStatus && (
            <div className="rounded-2xl bg-surface-high p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span>{localStatus}</span>
                <span>{localProgress}%</span>
              </div>
              <Progress value={localProgress} className="h-2" />
            </div>
          )}
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
                  {copy.detectedSource}:{" "}
                  <span className="text-foreground font-medium">
                    {result.detectedSourceLanguage}
                  </span>
                </p>
              )}

              <div className="rounded-2xl bg-background/60 p-4 max-h-[20rem] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
                  {result.translatedText}
                </pre>
              </div>

              {result.warnings && result.warnings.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-yellow-500 mb-2">
                    {copy.reviewNotes}
                  </p>
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
                  <p className="text-[11px] uppercase tracking-wider text-on-surface-variant mb-2">
                    {copy.ocrPreview}
                  </p>
                  <div className="rounded-2xl bg-background/40 p-4 max-h-40 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-xs leading-relaxed font-sans text-on-surface-variant">
                      {result.originalText}
                    </pre>
                  </div>
                </div>
              )}

              {translatedPdfBlob && (
                <p className="text-xs text-on-surface-variant">{copy.fallbackWarning}</p>
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
