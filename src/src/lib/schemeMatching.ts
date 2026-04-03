import { SchemeRow } from "@/hooks/useSchemes";

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
}

function normalizeText(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\u0900-\u097f\s]/gi, " ").replace(/\s+/g, " ").trim();
}

function tokenize(text: string) {
  return normalizeText(text)
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

export function findRelevantSchemes(schemes: SchemeRow[], input: string, limit = 3) {
  const normalizedInput = normalizeText(input);
  const tokens = tokenize(input);

  if (!normalizedInput || tokens.length === 0) {
    return [] as MatchedScheme[];
  }

  return schemes
    .map((scheme) => {
      const corpus = buildSchemeCorpus(scheme);
      const normalizedTitle = normalizeText(scheme.title);
      let score = 0;

      if (normalizedInput.includes(normalizedTitle)) {
        score += 20;
      }

      for (const token of tokens) {
        if (normalizedTitle.includes(token)) {
          score += 6;
        }

        if (corpus.includes(token)) {
          score += 2;
        }
      }

      if (normalizedInput.includes(normalizeText(scheme.category))) {
        score += 4;
      }

      if (normalizedInput.includes(normalizeText(scheme.state))) {
        score += 4;
      }

      if (normalizedInput.includes(normalizeText(scheme.benefit_type))) {
        score += 3;
      }

      return {
        score,
        scheme: toMatchedScheme(scheme),
      };
    })
    .filter((entry) => entry.score >= 4)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((entry) => entry.scheme);
}
