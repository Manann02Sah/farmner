export type RequiredDoc = {
  en: string;
  hi: string;
  instructionsEn: string[];
  instructionsHi: string[];
  previewBasePath: string;
};

export const REQUIRED_DOCS: Record<string, RequiredDoc[]> = {
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
        "Card ka poora front side dikhna chahiye aur chaaro kone frame me hone chahiye.",
        "Naam, Aadhaar number aur date of birth saaf dikhni chahiye.",
        "Blur, glare aur cropped kinare se bachen.",
      ],
      previewBasePath: "/documents/aadhaar-card",
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
        "Woh page upload karein jisme survey, khasra, khata ya owner details ho.",
        "Seal, signature aur registry numbers visible hone chahiye.",
        "Seedha, bright scan use karein aur folded corners se bachen.",
      ],
      previewBasePath: "/documents/land-ownership-document",
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
        "Woh page dikhayen jisme account holder name, account number aur IFSC ho.",
        "Bank name aur branch details readable honi chahiye.",
        "Door ki photo ke badle close, steady image use karein.",
      ],
      previewBasePath: "/documents/bank-passbook",
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
        "Registration ID aur farmer details visible honi chahiye.",
        "Issuing authority ya scheme portal header bhi dikhayen agar mumkin ho.",
        "Achhi light aur plain background me capture karein.",
      ],
      previewBasePath: "/documents/kisan-registration",
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
        "Seedhi front-side image use karein jisme number aur naam visible ho.",
        "Printed details ko fingers ya shadow se cover na karein.",
        "Compressed screenshot ke badle high-quality image use karein.",
      ],
      previewBasePath: "/documents/aadhaar-card",
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
        "PAN number, naam aur date of birth saaf dikhni chahiye.",
        "Flat image use karein taaki text distort na ho.",
        "Laminated cards par reflections se bachen.",
      ],
      previewBasePath: "/documents/pan-card",
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
        "Woh page dikhayen jisme registration number aur business name ho.",
        "Seal ya certificate header visible hona chahiye.",
        "Poora page frame ke andar hona chahiye.",
      ],
      previewBasePath: "/documents/business-registration",
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
        "GSTIN, legal name aur principal place fields visible rakhein.",
        "Certificate multi-section ho to full-page scan use karein.",
        "Angled images se bachen jo text padhna mushkil banati hain.",
      ],
      previewBasePath: "/documents/gst-certificate",
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
        "Pehla page use karein jisme account number aur statement period dikhe.",
        "Balance aur bank header visible rakhein.",
        "Extra cropping ke bina clean PDF ya screenshot upload karein.",
      ],
      previewBasePath: "/documents/bank-statement",
    },
  ],
};

export const DEFAULT_DOCS: RequiredDoc[] = [
  {
    en: "Aadhaar Card",
    hi: "Aadhaar Card",
    instructionsEn: [
      "Keep the full front side visible and readable.",
      "Use good light with no blur or shadow.",
      "Make sure the main identity fields are clear.",
    ],
    instructionsHi: [
      "Poora front side visible aur readable hona chahiye.",
      "Achhi light rakhein aur blur ya shadow se bachen.",
      "Main identity fields saaf honi chahiye.",
    ],
    previewBasePath: "/documents/aadhaar-card",
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
      "Woh page dikhayen jisme applicant name, income amount aur authority details ho.",
      "Seal ya date section bhi dikhayen agar ho.",
      "Folded ya hidden corners se bachen.",
    ],
    previewBasePath: "/documents/income-certificate",
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
      "Woh page dikhayen jisme account details aur IFSC ho.",
      "Bank header aur branch details readable honi chahiye.",
      "Close, stable shot ya flat scan use karein.",
    ],
    previewBasePath: "/documents/bank-passbook",
  },
];

export function getRequiredDocuments(category: string) {
  return REQUIRED_DOCS[category] || DEFAULT_DOCS;
}
