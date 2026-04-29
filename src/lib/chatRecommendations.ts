import { formatProfileSignals } from "@/lib/copilot";
import { FarmerProfile } from "@/lib/copilotTypes";
import { MatchedScheme } from "@/lib/schemeMatching";

type ChatRole = "user" | "assistant";

export type RecommendationTrigger = "explicit_request" | "high_confidence";

export type RecommendationBundle = {
  trigger: RecommendationTrigger;
  schemes: MatchedScheme[];
  summary: string;
  usedSignals: string[];
  unknowns: string[];
};

export type RecommendationDecision =
  | { mode: "none"; schemeCatalog: MatchedScheme[]; usedSignals: string[]; unknowns: string[] }
  | ({ mode: RecommendationTrigger; schemeCatalog: MatchedScheme[] } & RecommendationBundle);

const EXPLICIT_REQUEST_PATTERNS = [
  "best scheme",
  "best schemes",
  "recommend scheme",
  "recommend schemes",
  "suggest scheme",
  "suggest schemes",
  "which scheme",
  "what schemes",
  "what scheme",
  "apply for",
  "eligible for",
  "shortlist",
  "matching scheme",
  "matching schemes",
  "subsidy for",
  "yojana",
  "scheme for me",
  "show schemes",
  "find schemes",
  "government support",
  "which support",
  "recommendation",
  "योजना",
  "स्कीम",
  "कौन सी योजना",
  "सुझाव",
  "किस योजना",
];

const CROP_KEYWORDS = [
  "wheat",
  "rice",
  "paddy",
  "cotton",
  "maize",
  "millet",
  "mustard",
  "soybean",
  "sugarcane",
  "horticulture",
  "vegetable",
  "dairy",
  "livestock",
  "crop",
];

const BUSINESS_KEYWORDS = ["startup", "business", "enterprise", "shop", "manufacturer", "msme", "entrepreneur"];
const FARMING_KEYWORDS = ["farmer", "farming", "agriculture", "cultivation", "irrigation", "kisan"];

const normalizeText = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9\u0900-\u097f\s]/gi, " ").replace(/\s+/g, " ").trim();

const unique = (items: string[]) => [...new Set(items.filter(Boolean))];

function includesAny(text: string, items: string[]) {
  return items.some((item) => text.includes(normalizeText(item)));
}

function getTopScoreGap(matches: MatchedScheme[]) {
  const topScore = matches[0]?.recommendationContext?.score ?? 0;
  if (matches.length <= 1) return topScore;

  const comparisonScore =
    matches.length >= 3
      ? matches[2]?.recommendationContext?.score ?? 0
      : matches[1]?.recommendationContext?.score ?? 0;

  return topScore - comparisonScore;
}

function buildConversationSignals(
  conversationText: string,
  availableSchemes: MatchedScheme[],
  profile?: Partial<FarmerProfile> | null,
) {
  const normalizedConversation = normalizeText(conversationText);
  const usedSignals = formatProfileSignals(profile ?? {});
  const unknowns: string[] = [];

  const states = unique(
    availableSchemes
      .map((scheme) => scheme.state)
      .filter((state) => !["all states", "india", "national"].includes(normalizeText(state))),
  );

  for (const state of states) {
    if (normalizedConversation.includes(normalizeText(state))) {
      usedSignals.push(`Conversation state: ${state}`);
      break;
    }
  }

  const landMatch = conversationText.match(/\b\d+(?:\.\d+)?\s*(?:acre|acres|hectare|hectares)\b/i);
  if (landMatch) {
    usedSignals.push(`Landholding mentioned: ${landMatch[0]}`);
  }

  if (includesAny(normalizedConversation, CROP_KEYWORDS)) {
    usedSignals.push("Crop focus mentioned in chat");
  }

  if (includesAny(normalizedConversation, BUSINESS_KEYWORDS)) {
    usedSignals.push("Business activity mentioned in chat");
  }

  if (includesAny(normalizedConversation, FARMING_KEYWORDS)) {
    usedSignals.push("Farming activity mentioned in chat");
  }

  const hasStateSignal = usedSignals.some((signal) => normalizeText(signal).includes("state"));
  const hasCropSignal = usedSignals.some((signal) => normalizeText(signal).includes("crop"));
  const hasBusinessSignal = usedSignals.some((signal) => normalizeText(signal).includes("business"));

  if (!hasStateSignal) {
    unknowns.push("State is still missing.");
  }
  if (!hasCropSignal && !hasBusinessSignal) {
    unknowns.push("Crop focus or business type is still missing.");
  }

  return {
    usedSignals: unique(usedSignals),
    unknowns: unique(unknowns),
  };
}

function buildSummary(trigger: RecommendationTrigger, usedSignals: string[]) {
  if (trigger === "explicit_request") {
    return usedSignals.length > 0
      ? `Built this shortlist using ${usedSignals.slice(0, 2).join(" and ")}.`
      : "Built this shortlist from the conversation so far.";
  }

  return usedSignals.length > 0
    ? `I have enough context to suggest strong matches based on ${usedSignals.slice(0, 2).join(" and ")}.`
    : "I have enough context to suggest strong matches when you want them.";
}

export function getRecommendationBundleFromLegacy(
  matchedSchemes?: MatchedScheme[] | null,
): RecommendationBundle | null {
  if (!Array.isArray(matchedSchemes) || matchedSchemes.length === 0) return null;

  const usedSignals = unique(
    matchedSchemes.flatMap((scheme) => scheme.recommendationContext?.usedProfile ?? []).slice(0, 4),
  );
  const unknowns = unique(
    matchedSchemes.flatMap((scheme) => scheme.recommendationContext?.unknowns ?? []).slice(0, 3),
  );

  return {
    trigger: "explicit_request",
    schemes: matchedSchemes,
    summary: buildSummary("explicit_request", usedSignals),
    usedSignals,
    unknowns,
  };
}

export function decideRecommendationVisibility({
  messages,
  matches,
  profile,
}: {
  messages: Array<{ role: ChatRole; content: string }>;
  matches: MatchedScheme[];
  profile?: Partial<FarmerProfile> | null;
}): RecommendationDecision {
  const conversationText = messages.map((message) => message.content).join(" ");
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const explicitRequest = EXPLICIT_REQUEST_PATTERNS.some((pattern) =>
    normalizeText(latestUserMessage).includes(normalizeText(pattern)),
  );

  const shortlist = matches.slice(0, 3);
  const topScore = shortlist[0]?.recommendationContext?.score ?? 0;
  const scoreGap = getTopScoreGap(shortlist);
  const { usedSignals, unknowns } = buildConversationSignals(conversationText, matches, profile);
  const combinedUnknowns = unique([
    ...unknowns,
    ...shortlist.flatMap((scheme) => scheme.recommendationContext?.unknowns ?? []),
  ]).slice(0, 4);

  if (!shortlist.length || topScore < 8) {
    return {
      mode: "none",
      schemeCatalog: [],
      usedSignals,
      unknowns: combinedUnknowns,
    };
  }

  if (explicitRequest) {
    return {
      mode: "explicit_request",
      trigger: "explicit_request",
      schemes: shortlist,
      summary: buildSummary("explicit_request", usedSignals),
      usedSignals,
      unknowns: combinedUnknowns,
      schemeCatalog: matches.slice(0, 8),
    };
  }

  if (usedSignals.length >= 2 && scoreGap >= 3) {
    return {
      mode: "high_confidence",
      trigger: "high_confidence",
      schemes: shortlist,
      summary: buildSummary("high_confidence", usedSignals),
      usedSignals,
      unknowns: combinedUnknowns,
      schemeCatalog: matches.slice(0, 8),
    };
  }

  return {
    mode: "none",
    schemeCatalog: [],
    usedSignals,
    unknowns: combinedUnknowns,
  };
}
