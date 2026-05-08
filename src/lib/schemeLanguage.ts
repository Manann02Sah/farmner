export type AppLanguage = "en" | "hi";

const CATEGORY_TRANSLATIONS: Record<string, string> = {
  agriculture: "कृषि",
  credit: "ऋण",
  "credit loan": "ऋण",
  irrigation: "सिंचाई",
  insurance: "बीमा",
  startup: "स्टार्टअप",
  msme: "एमएसएमई",
  livestock: "पशुपालन",
  horticulture: "बागवानी",
  dairy: "डेयरी",
  fisheries: "मत्स्य",
  "women child": "महिला और बाल",
  education: "शिक्षा",
  health: "स्वास्थ्य",
  housing: "आवास",
};

const BENEFIT_TRANSLATIONS: Record<string, string> = {
  subsidies: "सब्सिडी",
  "credit loan": "ऋण सहायता",
  "direct cash": "प्रत्यक्ष सहायता",
  insurance: "बीमा सहायता",
  training: "प्रशिक्षण",
};

const PROFILE_VALUE_TRANSLATIONS: Record<string, string> = {
  farmer: "किसान",
  farming: "खेती",
  agriculture: "कृषि",
  entrepreneur: "उद्यमी",
  business: "व्यवसाय",
  startup: "स्टार्टअप",
  wheat: "गेहूं",
  rice: "धान",
  paddy: "धान",
  maize: "मक्का",
  cotton: "कपास",
  mustard: "सरसों",
  sugarcane: "गन्ना",
  soybean: "सोयाबीन",
  millet: "बाजरा",
  dairy: "डेयरी",
  livestock: "पशुपालन",
  horticulture: "बागवानी",
  vegetable: "सब्जी",
  general: "सामान्य",
};

const STATE_TRANSLATIONS: Record<string, string> = {
  "all states": "सभी राज्य",
  india: "भारत",
  national: "राष्ट्रीय",
  central: "केंद्रीय",
  punjab: "पंजाब",
  haryana: "हरियाणा",
  rajasthan: "राजस्थान",
  gujarat: "गुजरात",
  maharashtra: "महाराष्ट्र",
  "madhya pradesh": "मध्य प्रदेश",
  "uttar pradesh": "उत्तर प्रदेश",
  uttarakhand: "उत्तराखंड",
  bihar: "बिहार",
  jharkhand: "झारखंड",
  chhattisgarh: "छत्तीसगढ़",
  odisha: "ओडिशा",
  "west bengal": "पश्चिम बंगाल",
  assam: "असम",
  sikkim: "सिक्किम",
  meghalaya: "मेघालय",
  manipur: "मणिपुर",
  mizoram: "मिजोरम",
  tripura: "त्रिपुरा",
  nagaland: "नगालैंड",
  telangana: "तेलंगाना",
  "andhra pradesh": "आंध्र प्रदेश",
  karnataka: "कर्नाटक",
  kerala: "केरल",
  "tamil nadu": "तमिलनाडु",
  goa: "गोवा",
  delhi: "दिल्ली",
  "himachal pradesh": "हिमाचल प्रदेश",
  "jammu and kashmir": "जम्मू और कश्मीर",
  ladakh: "लद्दाख",
};

const SEARCH_ALIASES: Array<{ match: string; aliases: string[] }> = [
  { match: "योजना", aliases: ["scheme", "support"] },
  { match: "स्कीम", aliases: ["scheme", "support"] },
  { match: "किसान", aliases: ["farmer", "agriculture"] },
  { match: "खेती", aliases: ["farming", "agriculture"] },
  { match: "फसल", aliases: ["crop", "cultivation"] },
  { match: "सब्सिडी", aliases: ["subsidy"] },
  { match: "ऋण", aliases: ["loan", "credit"] },
  { match: "लोन", aliases: ["loan", "credit"] },
  { match: "व्यवसाय", aliases: ["business", "enterprise"] },
  { match: "उद्यम", aliases: ["enterprise", "business"] },
  { match: "स्टार्टअप", aliases: ["startup"] },
  { match: "सिंचाई", aliases: ["irrigation"] },
  { match: "सूक्ष्म सिंचाई", aliases: ["micro irrigation", "drip irrigation"] },
  { match: "डेयरी", aliases: ["dairy", "livestock"] },
  { match: "पशुपालन", aliases: ["livestock", "animal husbandry"] },
  { match: "गेहूं", aliases: ["wheat"] },
  { match: "गेंहू", aliases: ["wheat"] },
  { match: "धान", aliases: ["rice", "paddy"] },
  { match: "चावल", aliases: ["rice", "paddy"] },
  { match: "मक्का", aliases: ["maize"] },
  { match: "कपास", aliases: ["cotton"] },
  { match: "सरसों", aliases: ["mustard"] },
  { match: "गन्ना", aliases: ["sugarcane"] },
  { match: "सोयाबीन", aliases: ["soybean"] },
  { match: "बाजरा", aliases: ["millet"] },
  { match: "बागवानी", aliases: ["horticulture"] },
  { match: "सब्जी", aliases: ["vegetable"] },
];

const STATE_ALIASES: Record<string, string[]> = {
  Punjab: ["punjab", "पंजाब"],
  Haryana: ["haryana", "हरियाणा"],
  Rajasthan: ["rajasthan", "राजस्थान"],
  Gujarat: ["gujarat", "गुजरात"],
  Maharashtra: ["maharashtra", "महाराष्ट्र"],
  "Madhya Pradesh": ["madhya pradesh", "मध्य प्रदेश", "एमपी"],
  "Uttar Pradesh": ["uttar pradesh", "उत्तर प्रदेश", "यूपी"],
  Uttarakhand: ["uttarakhand", "उत्तराखंड"],
  Bihar: ["bihar", "बिहार"],
  Jharkhand: ["jharkhand", "झारखंड"],
  Chhattisgarh: ["chhattisgarh", "छत्तीसगढ़"],
  Odisha: ["odisha", "ओडिशा", "orissa"],
  "West Bengal": ["west bengal", "पश्चिम बंगाल", "बंगाल"],
  Assam: ["assam", "असम"],
  Sikkim: ["sikkim", "सिक्किम"],
  Meghalaya: ["meghalaya", "मेघालय"],
  Manipur: ["manipur", "मणिपुर"],
  Mizoram: ["mizoram", "मिजोरम"],
  Tripura: ["tripura", "त्रिपुरा"],
  Nagaland: ["nagaland", "नगालैंड"],
  Telangana: ["telangana", "तेलंगाना"],
  "Andhra Pradesh": ["andhra pradesh", "आंध्र प्रदेश", "एपी"],
  Karnataka: ["karnataka", "कर्नाटक"],
  Kerala: ["kerala", "केरल"],
  "Tamil Nadu": ["tamil nadu", "तमिलनाडु", "तमिल नाडु"],
  Goa: ["goa", "गोवा"],
  Delhi: ["delhi", "दिल्ली", "नई दिल्ली", "new delhi"],
  "Himachal Pradesh": ["himachal pradesh", "हिमाचल प्रदेश"],
  "Jammu and Kashmir": ["jammu and kashmir", "जम्मू और कश्मीर", "कश्मीर"],
  Ladakh: ["ladakh", "लद्दाख"],
  India: ["india", "भारत"],
  National: ["national", "राष्ट्रीय", "केंद्र"],
  "All States": ["all states", "सभी राज्य"],
  Central: ["central", "केंद्रीय"],
};

export function normalizeIndianText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\u0900-\u097f\s]/gi, " ").replace(/\s+/g, " ").trim();
}

export function expandSchemeSearchText(value: string) {
  const normalized = normalizeIndianText(value);
  if (!normalized) return normalized;

  const aliasTerms = SEARCH_ALIASES
    .filter((entry) => normalized.includes(normalizeIndianText(entry.match)))
    .flatMap((entry) => entry.aliases);

  const stateTerms = Object.entries(STATE_ALIASES)
    .filter(([, aliases]) => aliases.some((alias) => normalized.includes(normalizeIndianText(alias))))
    .flatMap(([state]) => [state, normalizeIndianText(state)]);

  const extraTerms = [...aliasTerms, ...stateTerms].filter(Boolean);
  return extraTerms.length > 0 ? `${normalized} ${extraTerms.join(" ")}` : normalized;
}

export function extractCanonicalStates(value: string) {
  const normalized = normalizeIndianText(value);
  if (!normalized) return [] as string[];

  return [
    ...new Set(
      Object.entries(STATE_ALIASES)
        .filter(([, aliases]) => aliases.some((alias) => normalized.includes(normalizeIndianText(alias))))
        .map(([state]) => state),
    ),
  ];
}

export function isNationalScopeState(value: string) {
  return ["All States", "National", "India", "Central"].includes(value);
}

function translateMappedValue(value: string, language: AppLanguage, dictionary: Record<string, string>) {
  if (language === "en") return value;
  return dictionary[normalizeIndianText(value)] ?? value;
}

export function localizeDynamicValue(value: string, language: AppLanguage) {
  if (language === "en") return value;

  const normalized = normalizeIndianText(value);
  return (
    PROFILE_VALUE_TRANSLATIONS[normalized] ??
    CATEGORY_TRANSLATIONS[normalized] ??
    BENEFIT_TRANSLATIONS[normalized] ??
    STATE_TRANSLATIONS[normalized] ??
    value
  );
}

export function localizeSchemeCategory(value: string, language: AppLanguage) {
  return translateMappedValue(value, language, CATEGORY_TRANSLATIONS);
}

export function localizeSchemeBenefit(value: string, language: AppLanguage) {
  return translateMappedValue(value, language, BENEFIT_TRANSLATIONS);
}

export function localizeSchemeState(value: string, language: AppLanguage) {
  return translateMappedValue(value, language, STATE_TRANSLATIONS);
}

export function buildLocalizedSchemeTitle(
  title: string,
  category: string,
  state: string,
  language: AppLanguage,
) {
  if (language === "en") return title;
  return `${localizeSchemeState(state, language)} के लिए ${localizeSchemeCategory(category, language)} सहायता योजना`;
}

export function buildLocalizedSchemeDescription(
  description: string,
  category: string,
  state: string,
  benefitType: string,
  maxBenefit: string | null,
  language: AppLanguage,
) {
  if (language === "en") return description;

  const localizedState = localizeSchemeState(state, language);
  const localizedCategory = localizeSchemeCategory(category, language);
  const localizedBenefit = localizeSchemeBenefit(benefitType, language);
  const maxBenefitText = maxBenefit ? ` अधिकतम लाभ ${maxBenefit} तक है।` : "";

  return `यह ${localizedState} के लिए ${localizedCategory} श्रेणी की ${localizedBenefit} आधारित योजना है।${maxBenefitText}`;
}

export function localizeSchemeReason(text: string, language: AppLanguage) {
  if (language !== "hi" || !text) return text;

  if (text === "Your request directly mentions this scheme.") return "आपके सवाल में इस योजना का सीधा उल्लेख है।";
  if (text === "Your saved state aligns with the scheme state.") return "आपकी प्रोफाइल का राज्य योजना के राज्य से मेल खाता है।";
  if (text === "Business type is reflected in the scheme details.") return "योजना के विवरण में आपका व्यवसाय प्रकार भी मेल खाता है।";
  if (text === "State is not set in the farmer profile.") return "किसान प्रोफाइल में राज्य नहीं दिया गया है।";
  if (text === "Crop information is missing.") return "फसल की जानकारी अभी नहीं दी गई है।";
  if (text === "Business type is not set.") return "व्यवसाय प्रकार अभी नहीं दिया गया है।";
  if (text === "Crop focus mentioned in chat") return "बातचीत में फसल फोकस बताया गया है।";
  if (text === "Business activity mentioned in chat") return "बातचीत में व्यवसाय गतिविधि बताई गई है।";
  if (text === "Farming activity mentioned in chat") return "बातचीत में खेती की गतिविधि बताई गई है।";
  if (text === "State is still missing.") return "राज्य की जानकारी अभी भी बाकी है।";
  if (text === "Crop focus or business type is still missing.") return "फसल फोकस या व्यवसाय प्रकार की जानकारी अभी बाकी है।";
  if (text === "Built this shortlist from the conversation so far.") return "यह शॉर्टलिस्ट अभी तक की बातचीत के आधार पर बनाई गई है।";
  if (text === "Built from the conversation context.") return "यह बातचीत के संदर्भ से तैयार किया गया है।";
  if (text === "No major gaps right now.") return "अभी कोई बड़ी जानकारी नहीं छूटी है।";

  if (text.startsWith('Matched the title using "')) {
    return text.replace(/^Matched the title using "(.+)"\.$/, 'योजना के नाम में "$1" मिला।');
  }
  if (text.startsWith('Matched scheme details using "')) {
    return text.replace(/^Matched scheme details using "(.+)"\.$/, 'योजना के विवरण में "$1" मिला।');
  }
  if (text.startsWith("Scheme category matches ")) {
    return text.replace(/^Scheme category matches (.+)\.$/, (_, value) => `योजना की श्रेणी ${localizeDynamicValue(value, language)} से मेल खाती है।`);
  }
  if (text.startsWith("Scheme state matches ")) {
    return text.replace(/^Scheme state matches (.+)\.$/, (_, value) => `योजना का राज्य ${localizeDynamicValue(value, language)} से मेल खाता है।`);
  }
  if (text.startsWith("Benefit type matches ")) {
    return text.replace(/^Benefit type matches (.+)\.$/, (_, value) => `लाभ प्रकार ${localizeDynamicValue(value, language)} से मेल खाता है।`);
  }
  if (text.startsWith('Scheme content aligns with crop focus "')) {
    return text.replace(/^Scheme content aligns with crop focus "(.+)"\.$/, (_, value) => `योजना का विवरण "${localizeDynamicValue(value, language)}" फसल फोकस से मेल खाता है।`);
  }
  if (text.startsWith("Profile state ")) {
    return text.replace(/^Profile state (.+) does not match scheme state (.+)\.$/, (_, left, right) => `प्रोफाइल का राज्य ${localizeDynamicValue(left, language)} योजना के राज्य ${localizeDynamicValue(right, language)} से मेल नहीं खाता।`);
  }
  if (text.startsWith("State: ")) {
    return text.replace(/^State: (.+)$/, (_, value) => `राज्य: ${localizeDynamicValue(value, language)}`);
  }
  if (text.startsWith("Crop focus: ")) {
    return text.replace(/^Crop focus: (.+)$/, (_, value) => `फसल फोकस: ${localizeDynamicValue(value, language)}`);
  }
  if (text.startsWith("Landholding: ")) {
    return text.replace(/^Landholding: (.+)$/, "भूमि होल्डिंग: $1");
  }
  if (text.startsWith("Category: ")) {
    return text.replace(/^Category: (.+)$/, (_, value) => `श्रेणी: ${localizeDynamicValue(value, language)}`);
  }
  if (text.startsWith("Income band: ")) {
    return text.replace(/^Income band: (.+)$/, "आय वर्ग: $1");
  }
  if (text.startsWith("Business type: ")) {
    return text.replace(/^Business type: (.+)$/, (_, value) => `व्यवसाय प्रकार: ${localizeDynamicValue(value, language)}`);
  }
  if (text.startsWith("Conversation state: ")) {
    return text.replace(/^Conversation state: (.+)$/, (_, value) => `बातचीत में राज्य: ${localizeDynamicValue(value, language)}`);
  }
  if (text.startsWith("Landholding mentioned: ")) {
    return text.replace(/^Landholding mentioned: (.+)$/, "बातचीत में भूमि होल्डिंग: $1");
  }
  if (text.startsWith("Built this shortlist using ")) {
    return text.replace(/^Built this shortlist using (.+)\.$/, "यह शॉर्टलिस्ट $1 के आधार पर बनाई गई है।");
  }
  if (text.startsWith("I have enough context to suggest strong matches based on ")) {
    return text.replace(/^I have enough context to suggest strong matches based on (.+)\.$/, "मेरे पास $1 के आधार पर अच्छे मिलान सुझाने के लिए पर्याप्त जानकारी है।");
  }
  if (text === "I have enough context to suggest strong matches when you want them.") {
    return "जब आप चाहें, मेरे पास अच्छे मिलान सुझाने के लिए पर्याप्त जानकारी है।";
  }

  return text;
}
