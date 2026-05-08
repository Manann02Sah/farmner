import { SchemeRow } from "@/hooks/useSchemes";
import { FarmerProfile, RecommendationContext } from "@/lib/copilotTypes";
import { expandSchemeSearchText, extractCanonicalStates, isNationalScopeState, normalizeIndianText } from "@/lib/schemeLanguage";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "scheme",
  "schemes",
  "show",
  "the",
  "to",
  "what",
  "which",
  "with",
]);

export interface MatchedScheme {
  id: string;
  title: string;
  description: string;
  category: string;
  state: string;
  benefit_type: string;
  max_benefit: string | null;
  eligibility: string | null;
  website_url: string | null;
  recommendationContext?: RecommendationContext;
}

function normalizeText(text: string) {
  return normalizeIndianText(text);
}

function tokenize(text: string) {
  return expandSchemeSearchText(text)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

function buildSchemeCorpus(scheme: SchemeRow) {
  return normalizeText(
    [
      scheme.title,
      scheme.description,
      scheme.category,
      scheme.state,
      scheme.benefit_type,
      scheme.eligibility ?? "",
      scheme.ministry ?? "",
      ...(scheme.benefits ?? []),
    ].join(" "),
  );
}

function toMatchedScheme(scheme: SchemeRow): MatchedScheme {
  return {
    id: scheme.id,
    title: scheme.title,
    description: scheme.description,
    category: scheme.category,
    state: scheme.state,
    benefit_type: scheme.benefit_type,
    max_benefit: scheme.max_benefit,
    eligibility: scheme.eligibility,
    website_url: scheme.website_url,
  };
}

function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))];
}

export function findRelevantSchemes(
  schemes: SchemeRow[],
  input: string,
  limit = 3,
  options?: { profile?: Partial<FarmerProfile> | null },
) {
  const normalizedInput = expandSchemeSearchText(input);
  const tokens = tokenize(input);
  const profile = options?.profile;
  const requestedStates = extractCanonicalStates(input);

  if (!normalizedInput || tokens.length === 0) {
    return [] as MatchedScheme[];
  }

  return schemes
    .map((scheme) => {
      const corpus = buildSchemeCorpus(scheme);
      const normalizedTitle = normalizeText(scheme.title);
      let score = 0;
      const whyMatched: string[] = [];
      const usedProfile: string[] = [];
      const unknowns: string[] = [];
      const risks: string[] = [];

      if (normalizedInput.includes(normalizedTitle)) {
        score += 20;
        whyMatched.push("Your request directly mentions this scheme.");
      }

      for (const token of tokens) {
        if (normalizedTitle.includes(token)) {
          score += 6;
          whyMatched.push(`Matched the title using "${token}".`);
        }

        if (corpus.includes(token)) {
          score += 2;
          whyMatched.push(`Matched scheme details using "${token}".`);
        }
      }

      if (normalizedInput.includes(normalizeText(scheme.category))) {
        score += 4;
        whyMatched.push(`Scheme category matches ${scheme.category}.`);
      }

      if (normalizedInput.includes(normalizeText(scheme.state))) {
        score += 4;
        whyMatched.push(`Scheme state matches ${scheme.state}.`);
      }

      if (requestedStates.length > 0) {
        if (requestedStates.includes(scheme.state) || isNationalScopeState(scheme.state)) {
          score += requestedStates.includes(scheme.state) ? 12 : 2;
          if (requestedStates.includes(scheme.state)) {
            whyMatched.push(`Scheme state matches ${scheme.state}.`);
          }
        } else {
          score -= 10;
          risks.push(`Requested state does not match scheme state ${scheme.state}.`);
        }
      }

      if (normalizedInput.includes(normalizeText(scheme.benefit_type))) {
        score += 3;
        whyMatched.push(`Benefit type matches ${scheme.benefit_type}.`);
      }

      if (!profile?.state) {
        unknowns.push("State is not set in the farmer profile.");
      } else if (normalizeText(profile.state) === normalizeText(scheme.state)) {
        score += 5;
        usedProfile.push(`State: ${profile.state}`);
        whyMatched.push("Your saved state aligns with the scheme state.");
      } else if (!isNationalScopeState(scheme.state)) {
        risks.push(`Profile state ${profile.state} does not match scheme state ${scheme.state}.`);
      }

      if (!profile?.cropType && (!profile?.savedCrops || profile.savedCrops.length === 0)) {
        unknowns.push("Crop information is missing.");
      } else {
        const crops = [profile.cropType, ...(profile.savedCrops ?? [])].filter(Boolean) as string[];
        for (const crop of crops) {
          if (corpus.includes(normalizeText(crop))) {
            score += 4;
            usedProfile.push(`Crop: ${crop}`);
            whyMatched.push(`Scheme content aligns with crop focus "${crop}".`);
          }
        }
      }

      if (!profile?.businessType) {
        unknowns.push("Business type is not set.");
      } else if (corpus.includes(normalizeText(profile.businessType))) {
        score += 3;
        usedProfile.push(`Business type: ${profile.businessType}`);
        whyMatched.push("Business type is reflected in the scheme details.");
      }

      return {
        score,
        scheme: {
          ...toMatchedScheme(scheme),
          recommendationContext: {
            whyMatched: unique(whyMatched).slice(0, 4),
            usedProfile: unique(usedProfile).slice(0, 4),
            unknowns: unique(unknowns).slice(0, 3),
            risks: unique(risks).slice(0, 3),
            score,
          },
        },
      };
    })
    .filter((entry) => entry.score >= 4)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((entry) => entry.scheme);
}
