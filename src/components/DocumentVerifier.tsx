import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, FileText, Image as ImageIcon, Info, X } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { SchemeRow } from "@/hooks/useSchemes";

interface DocumentVerifierProps {
  scheme: SchemeRow;
  onClose: () => void;
}

type RequiredDoc = {
  en: string;
  hi: string;
  instructionsEn: string[];
  instructionsHi: string[];
  accent: string;
};

const REQUIRED_DOCS: Record<string, RequiredDoc[]> = {
  Agriculture: [
    {
      en: "Aadhaar Card",
      hi: "Aadhaar Card",
      instructionsEn: [
        "Keep the full front side visible with all four corners inside the frame.",
        "Make sure the name, Aadhaar number, and date of birth are readable.",
        "Avoid glare, blur, and cropped edges.",
      ],
      instructionsHi: [
        "Card ka pura front side dikhna chahiye aur chaaron kone frame me hone chahiye.",
        "Naam, Aadhaar number, aur date of birth saaf dikhne chahiye.",
        "Blur, glare, aur cut edges se bachein.",
      ],
      accent: "#ff9f1c",
    },
    {
      en: "Land Ownership Document",
      hi: "Land Ownership Document",
      instructionsEn: [
        "Upload the first page that shows survey, khasra, khata, or owner details.",
        "Keep seals, signatures, and registry numbers visible.",
        "Use a flat, bright scan with no folded corners.",
      ],
      instructionsHi: [
        "Wahi page dikhayein jisme survey, khasra, khata, ya owner details hon.",
        "Seal, signature, aur registry number clear dikhne chahiye.",
        "Folded corner ke bina seedha aur bright scan use karein.",
      ],
      accent: "#5aa469",
    },
    {
      en: "Bank Passbook",
      hi: "Bank Passbook",
      instructionsEn: [
        "Show the page with account holder name, account number, and IFSC.",
        "Keep bank name and branch details readable.",
        "Use a close, steady image instead of a distant photo.",
      ],
      instructionsHi: [
        "Wahi page dikhayein jisme account holder name, account number, aur IFSC ho.",
        "Bank name aur branch details padhne layak honi chahiye.",
        "Door se photo ki jagah close aur steady image use karein.",
      ],
      accent: "#3a86ff",
    },
    {
      en: "Kisan Registration",
      hi: "Kisan Registration",
      instructionsEn: [
        "Keep the registration ID and farmer details visible.",
        "Include the issuing authority or scheme portal header if possible.",
        "Capture the page in good light with a plain background.",
      ],
      instructionsHi: [
        "Registration ID aur farmer details saaf dikhni chahiye.",
        "Agar ho sake to authority ya portal ka header bhi include karein.",
        "Achhi light aur plain background me image lein.",
      ],
      accent: "#7b2cbf",
    },
  ],
  MSME: [
    {
      en: "Aadhaar Card",
      hi: "Aadhaar Card",
      instructionsEn: [
        "Use a straight front-side image with the number and name visible.",
        "Do not cover any printed details with fingers or shadows.",
        "Prefer a high-quality image over a compressed screenshot.",
      ],
      instructionsHi: [
        "Seedhi front-side image use karein jisme number aur naam dikh raha ho.",
        "Finger ya shadow se koi detail cover na ho.",
        "Compressed screenshot ki jagah clear image use karein.",
      ],
      accent: "#ff9f1c",
    },
    {
      en: "PAN Card",
      hi: "PAN Card",
      instructionsEn: [
        "Keep the PAN number, name, and date of birth readable.",
        "Use a flat image so the card text does not distort.",
        "Avoid reflections on laminated cards.",
      ],
      instructionsHi: [
        "PAN number, naam, aur date of birth clear dikhni chahiye.",
        "Card ko seedha rakhkar image lein taaki text distort na ho.",
        "Laminated card par reflection se bachein.",
      ],
      accent: "#ef476f",
    },
    {
      en: "Business Registration",
      hi: "Business Registration",
      instructionsEn: [
        "Show the page with registration number and business name.",
        "Keep the seal or certificate header visible.",
        "Make sure the entire page is inside the frame.",
      ],
      instructionsHi: [
        "Wahi page dikhayein jisme registration number aur business name ho.",
        "Seal ya certificate header visible rakhein.",
        "Pura page frame ke andar hona chahiye.",
      ],
      accent: "#118ab2",
    },
    {
      en: "GST Certificate",
      hi: "GST Certificate",
      instructionsEn: [
        "Keep GSTIN, legal name, and principal place fields visible.",
        "Use a full-page scan if the certificate is multi-section.",
        "Avoid angled images that make text harder to read.",
      ],
      instructionsHi: [
        "GSTIN, legal name, aur principal place fields visible honi chahiye.",
        "Agar certificate multi-section hai to full-page scan use karein.",
        "Tedi image se bachein kyunki text padhna mushkil hota hai.",
      ],
      accent: "#06d6a0",
    },
    {
      en: "Bank Statement",
      hi: "Bank Statement",
      instructionsEn: [
        "Use the first page that shows account number and statement period.",
        "Keep balances and bank header visible.",
        "Upload a clean PDF or screenshot without extra cropping.",
      ],
      instructionsHi: [
        "First page dikhayein jisme account number aur statement period ho.",
        "Balance aur bank header visible rakhein.",
        "Extra crop ke bina clean PDF ya screenshot upload karein.",
      ],
      accent: "#3a86ff",
    },
  ],
};

const DEFAULT_DOCS: RequiredDoc[] = [
  {
    en: "Aadhaar Card",
    hi: "Aadhaar Card",
    instructionsEn: [
      "Keep the full front side visible and readable.",
      "Use good light with no blur or shadow.",
      "Make sure the main identity fields are clear.",
    ],
    instructionsHi: [
      "Pura front side visible aur readable hona chahiye.",
      "Achhi light use karein aur blur ya shadow se bachein.",
      "Main identity fields clear honi chahiye.",
    ],
    accent: "#ff9f1c",
  },
  {
    en: "Income Certificate",
    hi: "Income Certificate",
    instructionsEn: [
      "Show the page with applicant name, income amount, and authority details.",
      "Include the seal or date section if present.",
      "Avoid folded or partially hidden corners.",
    ],
    instructionsHi: [
      "Wahi page dikhayein jisme applicant name, income amount, aur authority details hon.",
      "Agar ho to seal ya date section bhi include karein.",
      "Folded ya hidden corners se bachein.",
    ],
    accent: "#06d6a0",
  },
  {
    en: "Bank Passbook",
    hi: "Bank Passbook",
    instructionsEn: [
      "Show the page with account details and IFSC.",
      "Keep the bank header and branch details readable.",
      "Use a close, stable shot or flat scan.",
    ],
    instructionsHi: [
      "Wahi page dikhayein jisme account details aur IFSC ho.",
      "Bank header aur branch details readable honi chahiye.",
      "Close aur stable shot ya flat scan use karein.",
    ],
    accent: "#3a86ff",
  },
];

function buildSamplePreview(docTitle: string, accent: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
      <rect width="640" height="420" rx="28" fill="#f7f4ea"/>
      <rect x="34" y="34" width="572" height="352" rx="24" fill="#ffffff" stroke="${accent}" stroke-width="4"/>
      <rect x="58" y="58" width="160" height="26" rx="13" fill="${accent}" opacity="0.18"/>
      <rect x="58" y="104" width="210" height="150" rx="18" fill="#ece8db"/>
      <circle cx="163" cy="157" r="42" fill="${accent}" opacity="0.22"/>
      <rect x="308" y="108" width="240" height="18" rx="9" fill="#d8d2c2"/>
      <rect x="308" y="142" width="200" height="18" rx="9" fill="#ebe6d7"/>
      <rect x="308" y="176" width="220" height="18" rx="9" fill="#d8d2c2"/>
      <rect x="58" y="284" width="490" height="14" rx="7" fill="#ebe6d7"/>
      <rect x="58" y="312" width="418" height="14" rx="7" fill="#d8d2c2"/>
      <rect x="58" y="340" width="364" height="14" rx="7" fill="#ebe6d7"/>
      <text x="58" y="90" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#1f2937">${docTitle}</text>
      <text x="320" y="236" font-family="Arial, sans-serif" font-size="16" fill="#6b7280">Sample document layout</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const DocumentVerifier = ({ scheme, onClose }: DocumentVerifierProps) => {
  const { t, language } = useLanguage();
  const requiredDocs = REQUIRED_DOCS[scheme.category] || DEFAULT_DOCS;
  const [expandedDoc, setExpandedDoc] = useState<string | null>(requiredDocs[0]?.en ?? null);

  const docsWithPreview = useMemo(
    () =>
      requiredDocs.map((doc) => ({
        ...doc,
        preview: buildSamplePreview(doc.en, doc.accent),
      })),
    [requiredDocs],
  );

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
            <p className="text-xs text-primary/70 mt-0.5">
              {language === "hi"
                ? "Har document ke liye sample image aur upload guidance"
                : "Sample image and upload guidance for each required document"}
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
          <div className="mb-6 rounded-2xl bg-primary/6 border border-primary/15 p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-foreground">
                  {language === "hi" ? "Automatic OCR verification hata diya gaya hai" : "Automatic OCR verification has been removed"}
                </p>
                <p className="text-sm text-on-surface-variant mt-1">
                  {language === "hi"
                    ? "Ab yahan sirf example document image aur simple instructions dikhaye jaate hain taaki user sahi file upload kar sake."
                    : "This section now shows only sample document images and simple instructions so the user can upload the correct file format and page."}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {docsWithPreview.map((doc) => {
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
                      <div>
                        <p className="font-semibold text-sm">{language === "hi" ? doc.hi : doc.en}</p>
                        <p className="text-xs text-on-surface-variant">
                          {language === "hi" ? "Example image aur upload steps" : "Example image and upload steps"}
                        </p>
                      </div>
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
                        <img
                          src={doc.preview}
                          alt={`${doc.en} sample`}
                          className="w-full rounded-xl border border-outline-variant/20"
                        />
                        <p className="text-xs text-on-surface-variant mt-3">
                          {language === "hi"
                            ? "Yeh sirf sample layout hai. Isse milta-julta clear page upload karein."
                            : "This is only a sample layout. Upload a clear page that looks similar."}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-outline-variant/20 bg-surface-container p-4">
                        <p className="text-xs uppercase tracking-widest text-primary mb-3">
                          {language === "hi" ? "Upload Instructions" : "Upload Instructions"}
                        </p>
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
