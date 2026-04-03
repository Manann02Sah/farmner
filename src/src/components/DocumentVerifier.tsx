import { useRef, useState } from "react";
import { Upload, CheckCircle, AlertCircle, XCircle, Loader2, FileText, X, ScanLine, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { invokeJsonEdgeFunction } from "@/lib/edgeFunctions";
import { SchemeRow } from "@/hooks/useSchemes";

const VERIFY_DOCUMENT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-document`;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SUPPORTED_FORMATS = ".pdf,.jpg,.jpeg,.png,.webp";
const MAX_FILE_SIZE_MB = 10;

interface DocumentVerifierProps {
  scheme: SchemeRow;
  onClose: () => void;
}

interface DocStatus {
  file: File | null;
  status: "pending" | "verifying" | "VERIFIED" | "NEEDS_REVIEW" | "REJECTED";
  confidence?: number;
  message?: string;
  tips?: string[];
  extractedText?: string;
  detectedFields?: string[];
  missingFields?: string[];
  ocrPerformed?: boolean;
  previewUrl?: string;
}

type RequiredDoc = { en: string; hi: string };

const REQUIRED_DOCS: Record<string, RequiredDoc[]> = {
  Agriculture: [
    { en: "Aadhaar Card", hi: "आधार कार्ड" },
    { en: "Land Ownership Document", hi: "भूमि स्वामित्व दस्तावेज़" },
    { en: "Bank Passbook", hi: "बैंक पासबुक" },
    { en: "Kisan Registration", hi: "किसान पंजीकरण" },
  ],
  MSME: [
    { en: "Aadhaar Card", hi: "आधार कार्ड" },
    { en: "PAN Card", hi: "पैन कार्ड" },
    { en: "Business Registration", hi: "व्यापार पंजीकरण" },
    { en: "GST Certificate", hi: "GST प्रमाणपत्र" },
    { en: "Bank Statement", hi: "बैंक स्टेटमेंट" },
  ],
  Startup: [
    { en: "Aadhaar Card", hi: "आधार कार्ड" },
    { en: "PAN Card", hi: "पैन कार्ड" },
    { en: "DPIIT Recognition Certificate", hi: "DPIIT मान्यता प्रमाणपत्र" },
    { en: "Incorporation Certificate", hi: "निगमन प्रमाणपत्र" },
    { en: "Pitch Deck", hi: "पिच डेक" },
  ],
  "Women & Child": [
    { en: "Aadhaar Card", hi: "आधार कार्ड" },
    { en: "Income Certificate", hi: "आय प्रमाणपत्र" },
    { en: "Ration Card", hi: "राशन कार्ड" },
    { en: "Birth Certificate", hi: "जन्म प्रमाणपत्र" },
  ],
  Insurance: [
    { en: "Aadhaar Card", hi: "आधार कार्ड" },
    { en: "Bank Passbook", hi: "बैंक पासबुक" },
    { en: "Income Certificate", hi: "आय प्रमाणपत्र" },
    { en: "Medical Records", hi: "चिकित्सा रिकॉर्ड" },
  ],
  Credit: [
    { en: "Aadhaar Card", hi: "आधार कार्ड" },
    { en: "PAN Card", hi: "पैन कार्ड" },
    { en: "Income Proof", hi: "आय प्रमाण" },
    { en: "Bank Statement", hi: "बैंक स्टेटमेंट" },
    { en: "Collateral Documents", hi: "संपार्श्विक दस्तावेज़" },
  ],
  Education: [
    { en: "Aadhaar Card", hi: "आधार कार्ड" },
    { en: "Mark Sheets", hi: "अंकपत्र" },
    { en: "Income Certificate", hi: "आय प्रमाणपत्र" },
    { en: "Caste Certificate", hi: "जाति प्रमाणपत्र" },
  ],
  Housing: [
    { en: "Aadhaar Card", hi: "आधार कार्ड" },
    { en: "Income Certificate", hi: "आय प्रमाणपत्र" },
    { en: "Land Documents", hi: "भूमि दस्तावेज़" },
    { en: "Bank Passbook", hi: "बैंक पासबुक" },
  ],
  Health: [
    { en: "Aadhaar Card", hi: "आधार कार्ड" },
    { en: "Ration Card", hi: "राशन कार्ड" },
    { en: "Income Certificate", hi: "आय प्रमाणपत्र" },
    { en: "Medical Reports", hi: "चिकित्सा रिपोर्ट" },
  ],
};

const DEFAULT_DOCS: RequiredDoc[] = [
  { en: "Aadhaar Card", hi: "आधार कार्ड" },
  { en: "Income Certificate", hi: "आय प्रमाणपत्र" },
  { en: "Bank Passbook", hi: "बैंक पासबुक" },
];

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

const DocumentVerifier = ({ scheme, onClose }: DocumentVerifierProps) => {
  const { t, language } = useLanguage();
  const requiredDocs = REQUIRED_DOCS[scheme.category] || DEFAULT_DOCS;
  const [docStatuses, setDocStatuses] = useState<Record<string, DocStatus>>(
    Object.fromEntries(requiredDocs.map((doc) => [doc.en, { file: null, status: "pending" }]))
  );
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const getDocLabel = (doc: RequiredDoc) => (language === "hi" ? doc.hi : doc.en);

  const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? PUBLISHABLE_KEY;

    return {
      apikey: PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    };
  };

  const handleFileSelect = async (docKey: string, file: File) => {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(
        language === "hi"
          ? `फ़ाइल ${MAX_FILE_SIZE_MB}MB से छोटी होनी चाहिए`
          : `File must be under ${MAX_FILE_SIZE_MB}MB`,
      );
      return;
    }

    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;

    setDocStatuses((prev) => ({
      ...prev,
      [docKey]: { file, status: "verifying", previewUrl },
    }));

    try {
      const fileBase64 = await readFileAsBase64(file);
      const data = await invokeJsonEdgeFunction<{
        status?: "VERIFIED" | "NEEDS_REVIEW" | "REJECTED";
        confidence?: number;
        message?: string;
        tips?: string[];
        extractedText?: string;
        detectedFields?: string[];
        missingFields?: string[];
        ocrPerformed?: boolean;
      }>(
        "verify-document",
        VERIFY_DOCUMENT_URL,
        {
          fileBase64,
          fileMimeType: file.type || "application/octet-stream",
          documentType: docKey,
          fileName: file.name,
          schemeTitle: scheme.title,
          language,
        },
        getAuthHeaders,
        language === "hi" ? "दस्तावेज़ सत्यापन विफल रहा" : "Document verification failed",
      );

      setDocStatuses((prev) => ({
        ...prev,
        [docKey]: {
          file,
          previewUrl,
          status: data.status || "NEEDS_REVIEW",
          confidence: data.confidence,
          message: data.message,
          tips: data.tips,
          extractedText: data.extractedText,
          detectedFields: data.detectedFields,
          missingFields: data.missingFields,
          ocrPerformed: data.ocrPerformed,
        },
      }));

      setExpandedDoc(docKey);
    } catch (error) {
      console.error("Document verification error:", error);
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : t("doc.autoVerifyFail");

      toast.error(message);
      setDocStatuses((prev) => ({
        ...prev,
        [docKey]: {
          file,
          previewUrl,
          status: "NEEDS_REVIEW",
          message,
          ocrPerformed: false,
        },
      }));
    }
  };

  const getStatusIcon = (status: DocStatus["status"]) => {
    switch (status) {
      case "VERIFIED":
        return <CheckCircle className="w-5 h-5 text-accent" />;
      case "NEEDS_REVIEW":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case "REJECTED":
        return <XCircle className="w-5 h-5 text-destructive" />;
      case "verifying":
        return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      default:
        return <FileText className="w-5 h-5 text-on-surface-variant" />;
    }
  };

  const getStatusColor = (status: DocStatus["status"]) => {
    switch (status) {
      case "VERIFIED":
        return "border-accent/50 bg-accent/5";
      case "NEEDS_REVIEW":
        return "border-yellow-500/50 bg-yellow-500/5";
      case "REJECTED":
        return "border-destructive/50 bg-destructive/5";
      case "verifying":
        return "border-primary/50 bg-primary/5";
      default:
        return "border-outline-variant/30";
    }
  };

  const verifiedCount = Object.values(docStatuses).filter((doc) => doc.status === "VERIFIED").length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-surface-container rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ghost-border"
      >
        <div className="sticky top-0 bg-surface-container p-6 pb-4 border-b border-outline-variant/10 flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-primary" />
              <h2 className="font-headline font-bold text-xl">{t("doc.title")}</h2>
            </div>
            <p className="text-sm text-on-surface-variant mt-1">{scheme.title}</p>
            <p className="text-xs text-primary/70 mt-0.5">
              {language === "hi" ? "AI दस्तावेज़ OCR स्कैन द्वारा संचालित" : "Powered by AI document OCR scan"}
            </p>
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
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{t("doc.requiredDocs")}</span>
              <span className="text-sm text-accent font-bold">
                {verifiedCount}/{requiredDocs.length}
              </span>
            </div>
            <div className="h-2 bg-surface-highest rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${(verifiedCount / requiredDocs.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-4">
            {requiredDocs.map((doc) => {
              const docKey = doc.en;
              const status = docStatuses[docKey];
              const isExpanded = expandedDoc === docKey;

              return (
                <div key={docKey} className={`rounded-xl border-2 ${getStatusColor(status.status)} p-4 transition-all`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(status.status)}
                      <div>
                        <p className="font-medium text-sm">{getDocLabel(doc)}</p>
                        {status.file && (
                          <p className="text-xs text-on-surface-variant">
                            {status.file.name} ({(status.file.size / 1024).toFixed(0)} KB)
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {status.ocrPerformed && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          <ScanLine className="w-3 h-3" />
                          OCR
                        </span>
                      )}

                      {status.confidence !== undefined && (
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-full ${
                            status.confidence >= 80
                              ? "bg-accent/10 text-accent"
                              : status.confidence >= 50
                                ? "bg-yellow-500/10 text-yellow-500"
                                : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {t("doc.confidence")}: {status.confidence}%
                        </span>
                      )}

                      {(status.extractedText || status.detectedFields?.length || status.missingFields?.length) && (
                        <button
                          type="button"
                          onClick={() => setExpandedDoc(isExpanded ? null : docKey)}
                          className="p-1 rounded-lg hover:bg-surface-highest transition-colors"
                          title={language === "hi" ? "OCR विवरण देखें" : "View OCR details"}
                        >
                          <Eye className="w-4 h-4 text-on-surface-variant" />
                        </button>
                      )}
                    </div>
                  </div>

                  {status.message && (
                    <p className="text-xs text-on-surface-variant mb-2 ml-8">{status.message}</p>
                  )}

                  {status.previewUrl && (
                    <div className="ml-8 mb-3">
                      <img
                        src={status.previewUrl}
                        alt={docKey}
                        className="h-20 w-auto rounded-lg object-cover border border-outline-variant/20"
                      />
                    </div>
                  )}

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="ml-8 mb-3 overflow-hidden"
                      >
                        {status.extractedText && status.extractedText !== "No file content available" && (
                          <div className="mb-3 rounded-lg bg-surface-high p-3">
                            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
                              {language === "hi" ? "OCR द्वारा निकाला गया टेक्स्ट" : "OCR Extracted Text"}
                            </p>
                            <p className="text-xs font-mono text-foreground/80 whitespace-pre-wrap">
                              {status.extractedText.slice(0, 400)}
                              {status.extractedText.length > 400 ? "..." : ""}
                            </p>
                          </div>
                        )}

                        {status.detectedFields && status.detectedFields.length > 0 && (
                          <div className="mb-2">
                            <p className="text-[10px] uppercase tracking-widest text-accent mb-1">
                              {language === "hi" ? "मिले फ़ील्ड" : "Detected Fields"}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {status.detectedFields.map((field, index) => (
                                <span key={`${field}-${index}`} className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                                  {`✓ ${field}`}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {status.missingFields && status.missingFields.length > 0 && (
                          <div className="mb-2">
                            <p className="text-[10px] uppercase tracking-widest text-destructive mb-1">
                              {language === "hi" ? "गुम फ़ील्ड" : "Missing Fields"}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {status.missingFields.map((field, index) => (
                                <span key={`${field}-${index}`} className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                                  {`✗ ${field}`}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {status.tips && status.tips.length > 0 && (
                    <ul className="ml-8 mb-2 space-y-1">
                      {status.tips.map((tip, index) => (
                        <li key={`${tip}-${index}`} className="text-xs text-on-surface-variant flex items-start gap-1">
                          <span className="text-primary mt-0.5">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  )}

                  {status.status === "pending" && (
                    <div
                      onClick={() => fileInputRefs.current[docKey]?.click()}
                      className="ml-8 mt-2 border-2 border-dashed border-outline-variant/30 rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    >
                      <Upload className="w-5 h-5 text-on-surface-variant" />
                      <span className="text-sm text-on-surface-variant text-center">
                        {language === "hi" ? "PDF, JPG, या PNG अपलोड करें — AI स्कैन करेगा" : "Upload PDF, JPG, or PNG — AI will scan it"}
                      </span>
                      <span className="text-[10px] text-on-surface-variant/60">
                        {language === "hi" ? `अधिकतम ${MAX_FILE_SIZE_MB}MB` : `Max ${MAX_FILE_SIZE_MB}MB`}
                      </span>
                    </div>
                  )}

                  {(status.status === "NEEDS_REVIEW" || status.status === "REJECTED") && (
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[docKey]?.click()}
                      className="ml-8 mt-2 text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" />
                      {t("doc.reupload")}
                    </button>
                  )}

                  <input
                    ref={(element) => {
                      fileInputRefs.current[docKey] = element;
                    }}
                    type="file"
                    accept={SUPPORTED_FORMATS}
                    className="hidden"
                    onChange={(event) => {
                      const selected = event.target.files?.[0];
                      if (selected) {
                        void handleFileSelect(docKey, selected);
                      }
                      event.target.value = "";
                    }}
                  />
                </div>
              );
            })}
          </div>

          {verifiedCount === requiredDocs.length && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 bg-accent/10 rounded-xl p-4 text-center"
            >
              <CheckCircle className="w-8 h-8 text-accent mx-auto mb-2" />
              <p className="font-headline font-bold text-accent">{t("doc.allVerified")}</p>
              <p className="text-xs text-on-surface-variant mt-1">
                {language === "hi" ? "सभी दस्तावेज़ AI OCR स्कैन द्वारा सत्यापित" : "All documents verified via AI OCR scan"}
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DocumentVerifier;
