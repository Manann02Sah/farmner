import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  Image as ImageIcon,
  Loader2,
  ShieldAlert,
  Upload,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDocumentReadiness } from "@/hooks/useDocumentReadiness";
import { SchemeRow } from "@/hooks/useSchemes";
import { supabase } from "@/integrations/supabase/client";
import { DocumentReadinessEntry } from "@/lib/copilotTypes";
import { getRequiredDocuments } from "@/lib/documentRequirements";
import { invokeJsonEdgeFunction } from "@/lib/edgeFunctions";
import { getSupabaseFunctionUrl, getSupabasePublishableKey } from "@/lib/supabaseConfig";

interface DocumentVerifierProps {
  scheme: SchemeRow;
  onClose: () => void;
}

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "svg"] as const;
const VERIFY_DOCUMENT_URL = getSupabaseFunctionUrl("verify-document");
const PUBLISHABLE_KEY = getSupabasePublishableKey();
const LOW_CONFIDENCE_THRESHOLD = 65;

function DocumentPreview({ basePath, alt }: { basePath: string; alt: string }) {
  const [extensionIndex, setExtensionIndex] = useState(0);

  return (
    <img
      src={`${basePath}.${IMAGE_EXTENSIONS[extensionIndex]}`}
      alt={alt}
      className="w-full rounded-xl border border-outline-variant/20"
      onError={() => {
        setExtensionIndex((current) =>
          current < IMAGE_EXTENSIONS.length - 1 ? current + 1 : current,
        );
      }}
    />
  );
}

type VerificationResult = {
  status: "VERIFIED" | "NEEDS_REVIEW" | "REJECTED";
  confidence: number;
  message: string;
  extractedText: string;
  detectedFields: string[];
  missingFields: string[];
  tips: string[];
  ocrPerformed: boolean;
};

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

const buildQualityWarnings = (result: VerificationResult) => {
  const qualityWarnings: string[] = [];

  if (result.confidence < 80) {
    qualityWarnings.push("Low OCR confidence");
  }
  if (result.missingFields.length > 0) {
    qualityWarnings.push(`Missing fields: ${result.missingFields.join(", ")}`);
  }
  if (result.extractedText.trim().length < 24) {
    qualityWarnings.push("Very little text detected");
  }

  return qualityWarnings;
};

const createFallbackVerificationResult = (
  documentType: string,
  fileName: string,
  message: string,
): VerificationResult => ({
  status: "NEEDS_REVIEW",
  confidence: 35,
  message: `${documentType} could not be auto-verified for ${fileName}. You can still continue with a warning and review it manually later.`,
  extractedText: "",
  detectedFields: [],
  missingFields: ["Auto-verification unavailable"],
  tips: [message],
  ocrPerformed: false,
});

const DocumentVerifier = ({ scheme, onClose }: DocumentVerifierProps) => {
  const { t, language } = useLanguage();
  const requiredDocs = getRequiredDocuments(scheme.category);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(requiredDocs[0]?.en ?? null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>(requiredDocs[0]?.en ?? "");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [lastVerifiedDocumentType, setLastVerifiedDocumentType] = useState<string | null>(null);
  const [pendingOverride, setPendingOverride] = useState<{
    documentType: string;
    fileName: string;
    result: VerificationResult;
    qualityWarnings: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { summary, saveReadinessEntry } = useDocumentReadiness(scheme.id ?? scheme.title, scheme.category);

  const activeDocument = requiredDocs.find((doc) => doc.en === expandedDoc) ?? requiredDocs[0];
  const selectedDocument = requiredDocs.find((doc) => doc.en === selectedDocumentType) ?? requiredDocs[0];

  const copy = useMemo(
    () =>
      language === "hi"
        ? {
            readinessTitle: "Application readiness",
            docsReady: "documents ready",
            uploadPrompt: "Selected document type",
            uploadHint: "Pehle document type select karein, phir upload karke OCR verification chalayen.",
            verifyButton: "Upload and verify",
            verifying: "Verifying...",
            confidenceWarningTitle: "Low-confidence warning",
            confidenceWarningBody:
              "Is document me kuch fields missing ho sakti hain ya OCR confidence low ho sakta hai. Agar aap continue karte hain to document warning ke saath accepted mark hoga.",
            continueAnyway: "Continue anyway",
            reviewAgain: "Review again",
            manualAccepted: "Accepted with warnings",
            missing: "Missing",
            noUpload: "No upload yet",
            scoreBased: "Confidence score",
            continueHint: "Some records like land documents can still be used even when formats vary.",
          }
        : {
            readinessTitle: "Application readiness",
            docsReady: "documents ready",
            uploadPrompt: "Selected document type",
            uploadHint: "Choose the document type first, then upload the file to run OCR verification.",
            verifyButton: "Upload and verify",
            verifying: "Verifying...",
            confidenceWarningTitle: "Low-confidence warning",
            confidenceWarningBody:
              "This document may still be usable, but some fields are missing or the OCR confidence is low. If you continue, it will be marked as accepted with warnings.",
            continueAnyway: "Continue anyway",
            reviewAgain: "Review again",
            manualAccepted: "Accepted with warnings",
            missing: "Missing",
            noUpload: "No upload yet",
            scoreBased: "Confidence score",
            continueHint: "Some records, especially land records, can still be valid even when the format varies.",
          },
    [language],
  );

  const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? PUBLISHABLE_KEY;

    return {
      apikey: PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    };
  };

  const saveEntry = async (entry: DocumentReadinessEntry) => {
    await saveReadinessEntry(entry);
    setLastVerifiedDocumentType(entry.documentType);
  };

  const acceptWithWarnings = async () => {
    if (!pendingOverride) return;

    const entry: DocumentReadinessEntry = {
      documentType: pendingOverride.documentType,
      fileName: pendingOverride.fileName,
      status: "ACCEPTED_WITH_WARNINGS",
      confidence: pendingOverride.result.confidence,
      qualityWarnings: pendingOverride.qualityWarnings,
      detectedFields: pendingOverride.result.detectedFields,
      missingFields: pendingOverride.result.missingFields,
      uploadedAt: new Date().toISOString(),
      manualOverride: true,
    };

    await saveEntry(entry);
    toast.warning(copy.manualAccepted);
    setPendingOverride(null);
  };

  const verifyFile = async (file: File) => {
    if (!selectedDocument) return;

    setIsVerifying(true);
    setSelectedFileName(file.name);
    setPendingOverride(null);

    try {
      const fileBase64 = await readFileAsBase64(file);
      const result = await invokeJsonEdgeFunction<VerificationResult>(
        "verify-document",
        VERIFY_DOCUMENT_URL,
        {
          documentType: selectedDocument.en,
          schemeTitle: scheme.title,
          language,
          fileName: file.name,
          fileMimeType: file.type || "application/octet-stream",
          fileBase64,
        },
        getAuthHeaders,
        t("doc.verifyFailed") || "Verification failed",
      );

      setVerificationResult(result);
      setLastVerifiedDocumentType(selectedDocument.en);

      const qualityWarnings = buildQualityWarnings(result);

      const entry: DocumentReadinessEntry = {
        documentType: selectedDocument.en,
        fileName: file.name,
        status: result.status,
        confidence: result.confidence,
        qualityWarnings,
        detectedFields: result.detectedFields,
        missingFields: result.missingFields,
        uploadedAt: new Date().toISOString(),
      };

      await saveEntry(entry);

      const needsOverride =
        result.confidence < LOW_CONFIDENCE_THRESHOLD ||
        result.status === "REJECTED" ||
        result.missingFields.length > 0;

      if (needsOverride) {
        setPendingOverride({
          documentType: selectedDocument.en,
          fileName: file.name,
          result,
          qualityWarnings,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : t("doc.autoVerifyFail") || "Auto verification failed";
      const fallbackResult = createFallbackVerificationResult(selectedDocument.en, file.name, message);
      const qualityWarnings = [
        "Verification service unavailable",
        "Manual review recommended",
      ];

      setVerificationResult(fallbackResult);
      setLastVerifiedDocumentType(selectedDocument.en);
      setPendingOverride({
        documentType: selectedDocument.en,
        fileName: file.name,
        result: fallbackResult,
        qualityWarnings,
      });

      await saveEntry({
        documentType: selectedDocument.en,
        fileName: file.name,
        status: "NEEDS_REVIEW",
        confidence: fallbackResult.confidence,
        qualityWarnings,
        detectedFields: [],
        missingFields: fallbackResult.missingFields,
        uploadedAt: new Date().toISOString(),
      });

      toast.error(message);
    } finally {
      setIsVerifying(false);
    }
  };

  const getEntryStatusLabel = (entry?: DocumentReadinessEntry) => {
    if (!entry) return copy.missing;
    if (entry.status === "ACCEPTED_WITH_WARNINGS") return copy.manualAccepted;
    return entry.status.replace("_", " ");
  };

  const resultDocumentType = lastVerifiedDocumentType ?? selectedDocumentType;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="bg-surface-container rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto ghost-border"
      >
        <div className="sticky top-0 bg-surface-container p-6 pb-4 border-b border-outline-variant/10 flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="font-headline font-bold text-xl">{t("doc.title")}</h2>
            </div>
            <p className="text-sm text-on-surface-variant mt-1">{scheme.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-highest transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="rounded-2xl border border-outline-variant/20 bg-surface-high/30 p-5 mb-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-on-surface-variant mb-1">
                  {copy.readinessTitle}
                </p>
                <p className="text-3xl font-headline font-bold">{summary.completionPct}%</p>
                <p className="text-sm text-on-surface-variant mt-1">
                  {summary.verifiedDocs.length}/{summary.requiredDocs.length} {copy.docsReady}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {summary.requiredDocs.map((doc) => {
                  const entry = summary.entries.find((item) => item.documentType === doc);
                  return (
                    <span
                      key={doc}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        entry?.status === "VERIFIED"
                          ? "bg-green-500/10 text-green-400"
                          : entry?.status === "ACCEPTED_WITH_WARNINGS"
                            ? "bg-yellow-500/10 text-yellow-300"
                            : entry?.status === "NEEDS_REVIEW"
                              ? "bg-yellow-500/10 text-yellow-300"
                              : entry?.status === "REJECTED"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-surface-highest text-on-surface-variant"
                      }`}
                    >
                      {doc}: {getEntryStatusLabel(entry)}
                    </span>
                  );
                })}
              </div>
            </div>

            {summary.qualityWarnings.length > 0 && (
              <p className="text-sm text-yellow-300 mt-4">{summary.qualityWarnings.slice(0, 3).join(" | ")}</p>
            )}
          </div>

          <div className="rounded-2xl border border-outline-variant/20 bg-surface-high/30 p-5 mb-6">
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-on-surface-variant mb-1">
                    {copy.uploadPrompt}
                  </p>
                  <select
                    value={selectedDocumentType}
                    onChange={(event) => {
                      setSelectedDocumentType(event.target.value);
                      setExpandedDoc(event.target.value);
                    }}
                    className="w-full rounded-xl border border-outline-variant/20 bg-surface-high px-3 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {requiredDocs.map((doc) => (
                      <option key={doc.en} value={doc.en}>
                        {language === "hi" ? doc.hi : doc.en}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="text-sm text-on-surface-variant">
                  {selectedFileName || copy.uploadHint}
                </p>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isVerifying}
                className="gradient-primary text-primary-foreground font-medium px-5 py-3 rounded-xl inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {isVerifying ? copy.verifying : copy.verifyButton}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void verifyFile(file);
                }
                event.target.value = "";
              }}
            />

            {pendingOverride && (
              <div className="mt-5 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-yellow-300 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-yellow-200">{copy.confidenceWarningTitle}</p>
                    <p className="text-sm text-yellow-100/90 mt-1">{copy.confidenceWarningBody}</p>
                    <p className="text-xs text-yellow-200 mt-3">
                      {copy.scoreBased}: {pendingOverride.result.confidence}% • {copy.continueHint}
                    </p>
                    {pendingOverride.qualityWarnings.length > 0 && (
                      <p className="text-xs text-yellow-100/90 mt-2">
                        {pendingOverride.qualityWarnings.join(" | ")}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-4">
                      <button
                        type="button"
                        onClick={() => void acceptWithWarnings()}
                        className="rounded-xl bg-yellow-300 text-yellow-950 px-4 py-2 text-sm font-medium"
                      >
                        {copy.continueAnyway}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingOverride(null)}
                        className="rounded-xl border border-yellow-200/30 px-4 py-2 text-sm text-yellow-100"
                      >
                        {copy.reviewAgain}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {verificationResult && (
              <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr,1.2fr]">
                <div className="rounded-2xl bg-background/50 p-4">
                  <p className="text-xs uppercase tracking-wider text-on-surface-variant mb-2">
                    {t("doc.confidence") || "Confidence"}
                  </p>
                  <p className="text-3xl font-headline font-bold mb-3">{verificationResult.confidence}%</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                      {verificationResult.status.replace("_", " ")}
                    </span>
                    <span className="inline-flex rounded-full bg-surface-highest px-3 py-1 text-xs font-medium text-on-surface-variant">
                      {resultDocumentType}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant mt-3">{verificationResult.message}</p>
                </div>

                <div className="rounded-2xl bg-background/50 p-4 space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-on-surface-variant mb-2">OCR</p>
                    <pre className="whitespace-pre-wrap text-sm text-foreground font-sans">
                      {verificationResult.extractedText}
                    </pre>
                  </div>

                  {verificationResult.detectedFields.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-on-surface-variant mb-2">Detected fields</p>
                      <div className="flex flex-wrap gap-2">
                        {verificationResult.detectedFields.map((field) => (
                          <span key={field} className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {verificationResult.missingFields.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-on-surface-variant mb-2">Missing fields</p>
                      <div className="flex flex-wrap gap-2">
                        {verificationResult.missingFields.map((field) => (
                          <span key={field} className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {verificationResult.tips.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-on-surface-variant mb-2">Tips</p>
                      <ul className="space-y-2">
                        {verificationResult.tips.map((tip) => (
                          <li key={tip} className="text-sm text-on-surface-variant">
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4">
            {requiredDocs.map((doc) => {
              const isExpanded = expandedDoc === doc.en;
              const instructions = language === "hi" ? doc.instructionsHi : doc.instructionsEn;
              const readinessEntry = summary.entries.find((entry) => entry.documentType === doc.en);

              return (
                <div key={doc.en} className="rounded-2xl border border-outline-variant/20 bg-surface-high/20 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedDoc(isExpanded ? null : doc.en);
                      setSelectedDocumentType(doc.en);
                    }}
                    className="w-full px-5 py-4 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{language === "hi" ? doc.hi : doc.en}</p>
                        <p className="text-xs text-on-surface-variant mt-1">
                          {readinessEntry?.fileName || copy.noUpload}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {readinessEntry && (
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            readinessEntry.status === "ACCEPTED_WITH_WARNINGS"
                              ? "bg-yellow-500/10 text-yellow-300"
                              : "bg-surface-highest text-on-surface-variant"
                          }`}
                        >
                          {getEntryStatusLabel(readinessEntry)}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-on-surface-variant" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-on-surface-variant" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 grid gap-5 md:grid-cols-[1.1fr,0.9fr]">
                      <div className="rounded-2xl border border-outline-variant/20 bg-[#fbf8ef] p-3">
                        <DocumentPreview basePath={doc.previewBasePath} alt={doc.en} />
                      </div>

                      <div className="rounded-2xl border border-outline-variant/20 bg-surface-container p-4">
                        <ul className="space-y-2">
                          {instructions.map((instruction) => (
                            <li key={instruction} className="text-sm text-on-surface-variant flex gap-2">
                              <span className="text-primary">•</span>
                              <span>{instruction}</span>
                            </li>
                          ))}
                        </ul>

                        {readinessEntry && (
                          <div className="mt-4 rounded-2xl bg-background/40 p-3">
                            <p className="text-xs uppercase tracking-wider text-on-surface-variant mb-2">
                              {copy.scoreBased}
                            </p>
                            <p className="text-lg font-bold">{readinessEntry.confidence}%</p>
                          </div>
                        )}

                        {readinessEntry?.qualityWarnings.length ? (
                          <div className="mt-4 rounded-2xl bg-yellow-500/10 p-3 text-xs text-yellow-300">
                            {readinessEntry.qualityWarnings.join(" | ")}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DocumentVerifier;
