import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, FileText, Image as ImageIcon, Loader2, Upload, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { SchemeRow } from "@/hooks/useSchemes";
import { supabase } from "@/integrations/supabase/client";
import { invokeJsonEdgeFunction } from "@/lib/edgeFunctions";
import { getSupabaseFunctionUrl, getSupabasePublishableKey } from "@/lib/supabaseConfig";

interface DocumentVerifierProps {
  scheme: SchemeRow;
  onClose: () => void;
}

type RequiredDoc = {
  en: string;
  hi: string;
  instructionsEn: string[];
  instructionsHi: string[];
  previewBasePath: string;
};

const REQUIRED_DOCS: Record<string, RequiredDoc[]> = {
  Agriculture: [
    {
      en: "Aadhaar Card",
      hi: "आधार कार्ड",
      instructionsEn: [
        "Keep the full front side visible with all four corners inside the frame.",
        "Make sure the name, Aadhaar number, and date of birth are readable.",
        "Avoid glare, blur, and cropped edges.",
      ],
      instructionsHi: [
        "कार्ड का पूरा फ्रंट साइड दिखना चाहिए और चारों कोने फ्रेम में होने चाहिए।",
        "नाम, आधार नंबर और जन्मतिथि साफ दिखनी चाहिए।",
        "ब्लर, चमक और कटे हुए किनारों से बचें।",
      ],
      previewBasePath: "/documents/aadhaar-card",
    },
    {
      en: "Land Ownership Document",
      hi: "भूमि स्वामित्व दस्तावेज़",
      instructionsEn: [
        "Upload the first page that shows survey, khasra, khata, or owner details.",
        "Keep seals, signatures, and registry numbers visible.",
        "Use a flat, bright scan with no folded corners.",
      ],
      instructionsHi: [
        "वह पेज अपलोड करें जिसमें सर्वे, खसरा, खाता या मालिक की जानकारी हो।",
        "सील, हस्ताक्षर और रजिस्ट्री नंबर साफ दिखने चाहिए।",
        "मुड़े हुए कोनों के बिना साफ और सीधा स्कैन उपयोग करें।",
      ],
      previewBasePath: "/documents/land-ownership-document",
    },
    {
      en: "Bank Passbook",
      hi: "बैंक पासबुक",
      instructionsEn: [
        "Show the page with account holder name, account number, and IFSC.",
        "Keep bank name and branch details readable.",
        "Use a close, steady image instead of a distant photo.",
      ],
      instructionsHi: [
        "वह पेज दिखाएँ जिसमें खाता धारक का नाम, खाता नंबर और IFSC हो।",
        "बैंक का नाम और शाखा विवरण पढ़ने योग्य होना चाहिए।",
        "दूर की फोटो की जगह पास से साफ तस्वीर लें।",
      ],
      previewBasePath: "/documents/bank-passbook",
    },
    {
      en: "Kisan Registration",
      hi: "किसान पंजीकरण",
      instructionsEn: [
        "Keep the registration ID and farmer details visible.",
        "Include the issuing authority or scheme portal header if possible.",
        "Capture the page in good light with a plain background.",
      ],
      instructionsHi: [
        "पंजीकरण आईडी और किसान विवरण साफ दिखाई दें।",
        "संभव हो तो जारी करने वाली संस्था या पोर्टल का हेडर भी दिखाएँ।",
        "अच्छी रोशनी और साधारण पृष्ठभूमि में फोटो लें।",
      ],
      previewBasePath: "/documents/kisan-registration",
    },
  ],
  MSME: [
    {
      en: "Aadhaar Card",
      hi: "आधार कार्ड",
      instructionsEn: [
        "Use a straight front-side image with the number and name visible.",
        "Do not cover any printed details with fingers or shadows.",
        "Prefer a high-quality image over a compressed screenshot.",
      ],
      instructionsHi: [
        "सीधी फ्रंट साइड छवि उपयोग करें जिसमें नंबर और नाम साफ दिखे।",
        "उंगलियों या परछाई से कोई विवरण ढका न हो।",
        "कंप्रेस्ड स्क्रीनशॉट की जगह साफ फोटो उपयोग करें।",
      ],
      previewBasePath: "/documents/aadhaar-card",
    },
    {
      en: "PAN Card",
      hi: "पैन कार्ड",
      instructionsEn: [
        "Keep the PAN number, name, and date of birth readable.",
        "Use a flat image so the card text does not distort.",
        "Avoid reflections on laminated cards.",
      ],
      instructionsHi: [
        "पैन नंबर, नाम और जन्मतिथि स्पष्ट दिखनी चाहिए।",
        "कार्ड को सीधा रखकर फोटो लें ताकि टेक्स्ट न बिगड़े।",
        "लैमिनेटेड कार्ड पर चमक से बचें।",
      ],
      previewBasePath: "/documents/pan-card",
    },
    {
      en: "Business Registration",
      hi: "व्यवसाय पंजीकरण",
      instructionsEn: [
        "Show the page with registration number and business name.",
        "Keep the seal or certificate header visible.",
        "Make sure the entire page is inside the frame.",
      ],
      instructionsHi: [
        "वह पेज दिखाएँ जिसमें पंजीकरण नंबर और व्यवसाय का नाम हो।",
        "सील या प्रमाणपत्र का हेडर दिखाई देना चाहिए।",
        "पूरा पेज फ्रेम के अंदर होना चाहिए।",
      ],
      previewBasePath: "/documents/business-registration",
    },
    {
      en: "GST Certificate",
      hi: "जीएसटी प्रमाणपत्र",
      instructionsEn: [
        "Keep GSTIN, legal name, and principal place fields visible.",
        "Use a full-page scan if the certificate is multi-section.",
        "Avoid angled images that make text harder to read.",
      ],
      instructionsHi: [
        "GSTIN, कानूनी नाम और प्रमुख स्थान की जानकारी दिखाई देनी चाहिए।",
        "यदि प्रमाणपत्र कई हिस्सों में है तो पूरा पेज स्कैन उपयोग करें।",
        "ऐसी तिरछी फोटो से बचें जिसमें टेक्स्ट पढ़ना कठिन हो।",
      ],
      previewBasePath: "/documents/gst-certificate",
    },
    {
      en: "Bank Statement",
      hi: "बैंक स्टेटमेंट",
      instructionsEn: [
        "Use the first page that shows account number and statement period.",
        "Keep balances and bank header visible.",
        "Upload a clean PDF or screenshot without extra cropping.",
      ],
      instructionsHi: [
        "पहला पेज उपयोग करें जिसमें खाता नंबर और स्टेटमेंट अवधि दिखे।",
        "बैलेंस और बैंक हेडर दिखाई देना चाहिए।",
        "अतिरिक्त कटाई के बिना साफ PDF या तस्वीर अपलोड करें।",
      ],
      previewBasePath: "/documents/bank-statement",
    },
  ],
};

const DEFAULT_DOCS: RequiredDoc[] = [
  {
    en: "Aadhaar Card",
    hi: "आधार कार्ड",
    instructionsEn: [
      "Keep the full front side visible and readable.",
      "Use good light with no blur or shadow.",
      "Make sure the main identity fields are clear.",
    ],
    instructionsHi: [
      "पूरा फ्रंट साइड दिखाई देना चाहिए और पढ़ने योग्य होना चाहिए।",
      "अच्छी रोशनी रखें और ब्लर या परछाई से बचें।",
      "मुख्य पहचान संबंधी जानकारी साफ होनी चाहिए।",
    ],
    previewBasePath: "/documents/aadhaar-card",
  },
  {
    en: "Income Certificate",
    hi: "आय प्रमाणपत्र",
    instructionsEn: [
      "Show the page with applicant name, income amount, and authority details.",
      "Include the seal or date section if present.",
      "Avoid folded or partially hidden corners.",
    ],
    instructionsHi: [
      "वह पेज दिखाएँ जिसमें आवेदक का नाम, आय राशि और प्राधिकरण की जानकारी हो।",
      "यदि हो तो सील या तारीख वाला हिस्सा भी शामिल करें।",
      "मुड़े हुए या छिपे हुए कोनों से बचें।",
    ],
    previewBasePath: "/documents/income-certificate",
  },
  {
    en: "Bank Passbook",
    hi: "बैंक पासबुक",
    instructionsEn: [
      "Show the page with account details and IFSC.",
      "Keep the bank header and branch details readable.",
      "Use a close, stable shot or flat scan.",
    ],
    instructionsHi: [
      "वह पेज दिखाएँ जिसमें खाता विवरण और IFSC हो।",
      "बैंक हेडर और शाखा विवरण पढ़ने योग्य होने चाहिए।",
      "पास से स्थिर फोटो या फ्लैट स्कैन उपयोग करें।",
    ],
    previewBasePath: "/documents/bank-passbook",
  },
];

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "svg"] as const;
const VERIFY_DOCUMENT_URL = getSupabaseFunctionUrl("verify-document");
const PUBLISHABLE_KEY = getSupabasePublishableKey();

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

const DocumentVerifier = ({ scheme, onClose }: DocumentVerifierProps) => {
  const { t, language } = useLanguage();
  const requiredDocs = REQUIRED_DOCS[scheme.category] || DEFAULT_DOCS;
  const [expandedDoc, setExpandedDoc] = useState<string | null>(requiredDocs[0]?.en ?? null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeDocument = requiredDocs.find((doc) => doc.en === expandedDoc) ?? requiredDocs[0];

  const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? PUBLISHABLE_KEY;

    return {
      apikey: PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    };
  };

  const verifyFile = async (file: File) => {
    if (!activeDocument) return;

    setIsVerifying(true);
    setSelectedFileName(file.name);

    try {
      const fileBase64 = await readFileAsBase64(file);
      const result = await invokeJsonEdgeFunction<VerificationResult>(
        "verify-document",
        VERIFY_DOCUMENT_URL,
        {
          documentType: activeDocument.en,
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
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : t("doc.autoVerifyFail") || "Auto verification failed";
      toast.error(message);
      setVerificationResult(null);
    } finally {
      setIsVerifying(false);
    }
  };

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
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-on-surface-variant mb-1">
                  {t("doc.requiredDocs") || "Required document"}
                </p>
                <p className="text-sm text-on-surface-variant mt-1">
                  {selectedFileName || "Upload a PDF or image for the selected document type to run OCR verification."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isVerifying}
                className="gradient-primary text-primary-foreground font-medium px-5 py-3 rounded-xl inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {isVerifying ? "Verifying..." : "Upload and verify"}
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

            {verificationResult && (
              <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr,1.2fr]">
                <div className="rounded-2xl bg-background/50 p-4">
                  <p className="text-xs uppercase tracking-wider text-on-surface-variant mb-2">
                    {t("doc.confidence") || "Confidence"}
                  </p>
                  <p className="text-3xl font-headline font-bold mb-3">{verificationResult.confidence}%</p>
                  <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                    {verificationResult.status.replace("_", " ")}
                  </span>
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

              return (
                <div key={doc.en} className="rounded-2xl border border-outline-variant/20 bg-surface-high/20 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedDoc(isExpanded ? null : doc.en)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-primary" />
                      </div>
                      <p className="font-semibold text-sm">{language === "hi" ? doc.hi : doc.en}</p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-on-surface-variant" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-on-surface-variant" />
                    )}
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
