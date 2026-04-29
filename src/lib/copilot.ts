import { SchemeRow } from "@/hooks/useSchemes";
import {
  DocumentReadinessSummary,
  EligibilityAssessment,
  FarmerProfile,
} from "@/lib/copilotTypes";
import { getRequiredDocuments } from "@/lib/documentRequirements";

const DEFAULT_PROFILE: FarmerProfile = {
  displayName: "",
  state: "",
  location: "",
  category: "",
  landholding: "",
  cropType: "",
  incomeBand: "",
  businessType: "",
  preferredLanguage: "en",
  savedCrops: [],
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeText = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/gi, " ").replace(/\s+/g, " ").trim();

const includesAny = (value: string, terms: string[]) => {
  const normalized = normalizeText(value);
  return terms.some((term) => normalized.includes(normalizeText(term)));
};

const unique = (items: string[]) => [...new Set(items.filter(Boolean))];

export function createEmptyProfile(language: "en" | "hi" = "en"): FarmerProfile {
  return { ...DEFAULT_PROFILE, preferredLanguage: language };
}

export function buildProfileSearchText(profile?: Partial<FarmerProfile> | null) {
  if (!profile) return "";

  return unique([
    profile.state,
    profile.location,
    profile.category,
    profile.landholding,
    profile.cropType,
    profile.incomeBand,
    profile.businessType,
    ...(profile.savedCrops ?? []),
  ]).join(" ");
}

export function formatProfileSignals(profile: Partial<FarmerProfile>) {
  return unique([
    profile.state ? `State: ${profile.state}` : "",
    profile.cropType ? `Crop focus: ${profile.cropType}` : "",
    profile.landholding ? `Landholding: ${profile.landholding}` : "",
    profile.category ? `Category: ${profile.category}` : "",
    profile.incomeBand ? `Income band: ${profile.incomeBand}` : "",
    profile.businessType ? `Business type: ${profile.businessType}` : "",
  ]);
}

function getSubmissionReadinessActions(readiness?: DocumentReadinessSummary) {
  if (!readiness) return [];

  const actions: string[] = [];
  if (readiness.missingDocs.length > 0) {
    actions.push(`Upload ${readiness.missingDocs.join(", ")}.`);
  }
  if (readiness.qualityWarnings.length > 0) {
    actions.push(`Recheck document quality: ${readiness.qualityWarnings.slice(0, 2).join(", ")}.`);
  }
  if (readiness.verifiedDocs.length > 0) {
    actions.push(`Keep verified copies ready: ${readiness.verifiedDocs.join(", ")}.`);
  }
  return actions;
}

export function assessSchemeEligibility(
  scheme: SchemeRow,
  profile?: Partial<FarmerProfile> | null,
  readiness?: DocumentReadinessSummary,
): EligibilityAssessment {
  const mergedProfile = { ...DEFAULT_PROFILE, ...(profile ?? {}) };
  const profileSignals = formatProfileSignals(mergedProfile);
  const matchedCriteria: string[] = [];
  const missingCriteria: string[] = [];
  const risks: string[] = [];
  const nextSteps: string[] = [];
  let confidence = 48;

  const schemeCorpus = normalizeText(
    [scheme.title, scheme.description, scheme.category, scheme.eligibility ?? "", ...(scheme.benefits ?? [])].join(" "),
  );

  if (!mergedProfile.state) {
    missingCriteria.push("Add your state to confirm whether the scheme applies where you live.");
  } else if (scheme.state === "All States" || scheme.state === "India" || scheme.state === "National") {
    matchedCriteria.push("The scheme is not restricted to a single state.");
    confidence += 10;
  } else if (normalizeText(mergedProfile.state) === normalizeText(scheme.state)) {
    matchedCriteria.push(`Your profile state matches ${scheme.state}.`);
    confidence += 14;
  } else {
    risks.push(`The scheme is listed for ${scheme.state}, but your profile is set to ${mergedProfile.state}.`);
    confidence -= 16;
  }

  if (scheme.category === "Agriculture") {
    if (mergedProfile.cropType || mergedProfile.landholding || includesAny(mergedProfile.businessType, ["farmer", "farming", "agriculture"])) {
      matchedCriteria.push("Your profile includes farming-related details relevant to an agriculture scheme.");
      confidence += 12;
    } else {
      missingCriteria.push("Add crop type, landholding, or farming activity to strengthen agriculture eligibility checks.");
    }
  }

  if (scheme.category === "MSME") {
    if (mergedProfile.businessType || includesAny(mergedProfile.category, ["entrepreneur", "startup", "business"])) {
      matchedCriteria.push("Your profile includes business information relevant to an MSME scheme.");
      confidence += 12;
    } else {
      missingCriteria.push("Add your business type to confirm MSME-specific fit.");
    }
  }

  if (mergedProfile.cropType && includesAny(schemeCorpus, [mergedProfile.cropType])) {
    matchedCriteria.push(`The scheme content mentions ${mergedProfile.cropType}-related support.`);
    confidence += 8;
  }

  if (includesAny(schemeCorpus, ["women", "female"]) && !mergedProfile.category) {
    missingCriteria.push("This scheme may depend on social or beneficiary category. Add your category to confirm.");
  }

  if (includesAny(schemeCorpus, ["sc", "st", "scheduled caste", "scheduled tribe", "obc"]) && !mergedProfile.category) {
    missingCriteria.push("Add your social category because the scheme appears to reference reserved-category eligibility.");
  }

  if (includesAny(schemeCorpus, ["income", "annual income", "below poverty", "bpl"]) && !mergedProfile.incomeBand) {
    missingCriteria.push("Add your income band to validate income-related criteria.");
  }

  if (includesAny(schemeCorpus, ["land", "acre", "hectare", "cultivable"])) {
    if (mergedProfile.landholding) {
      matchedCriteria.push("Your profile includes landholding information, which helps evaluate land-based criteria.");
      confidence += 6;
    } else {
      missingCriteria.push("Add landholding details because this scheme appears to depend on land records.");
    }
  }

  if (readiness) {
    if (readiness.completionPct >= 100) {
      matchedCriteria.push("All required documents are already verified for this scheme.");
      confidence += 10;
    } else if (readiness.verifiedDocs.length > 0) {
      matchedCriteria.push(`${readiness.verifiedDocs.length} required documents are already verified.`);
      confidence += 4;
    }

    if (readiness.missingDocs.length > 0) {
      nextSteps.push(`Upload the remaining documents: ${readiness.missingDocs.join(", ")}.`);
    }

    if (readiness.qualityWarnings.length > 0) {
      risks.push(`Some documents may need better scans: ${readiness.qualityWarnings.slice(0, 2).join(", ")}.`);
    }
  }

  nextSteps.push(...getSubmissionReadinessActions(readiness));

  if (!mergedProfile.displayName) {
    nextSteps.push("Save your basic farmer profile so future recommendations are more accurate.");
  }
  if (!mergedProfile.state) {
    nextSteps.push("Add your state before relying on this eligibility estimate.");
  }
  if (!mergedProfile.cropType && scheme.category === "Agriculture") {
    nextSteps.push("Add your crop focus to unlock more precise agriculture recommendations.");
  }
  if (!mergedProfile.businessType && scheme.category === "MSME") {
    nextSteps.push("Add your business type to tailor MSME guidance and paperwork.");
  }

  const recommendedDocuments = getRequiredDocuments(scheme.category).map((doc) => doc.en);

  const hasSevereRisk = risks.some((risk) => risk.includes("listed for"));
  const status =
    hasSevereRisk ? "at_risk" : missingCriteria.length > 0 ? "needs_info" : "likely_eligible";

  if (status === "likely_eligible") {
    confidence += 8;
  }
  if (status === "at_risk") {
    confidence -= 8;
  }

  confidence = clamp(confidence, 35, 96);

  const explanation =
    status === "likely_eligible"
      ? "This scheme looks like a strong fit based on the profile details already provided."
      : status === "needs_info"
        ? "This estimate is promising, but a few important profile or document details are still missing."
        : "There are one or more likely blockers, so this scheme should be reviewed carefully before applying.";

  return {
    status,
    confidence,
    matchedCriteria: unique(matchedCriteria),
    missingCriteria: unique(missingCriteria),
    risks: unique(risks),
    nextSteps: unique(nextSteps).slice(0, 6),
    recommendedDocuments,
    profileSignals,
    explanation,
  };
}

export function buildCopilotChecklist(
  scheme: SchemeRow,
  assessment: EligibilityAssessment,
  readiness?: DocumentReadinessSummary,
) {
  const checklist: string[] = [];

  checklist.push("Review the scheme snapshot and official website before applying.");

  if (assessment.missingCriteria.length > 0) {
    checklist.push("Answer the missing profile questions shown below the scorecard.");
  }

  if (readiness?.missingDocs.length) {
    checklist.push(`Upload missing documents: ${readiness.missingDocs.join(", ")}.`);
  }

  if (readiness?.qualityWarnings.length) {
    checklist.push("Replace low-quality or partial document uploads before submission.");
  }

  checklist.push(`Keep these key documents ready: ${getRequiredDocuments(scheme.category).slice(0, 3).map((doc) => doc.en).join(", ")}.`);

  if (scheme.website_url) {
    checklist.push("Use the official website link to cross-check deadline and latest application instructions.");
  }

  return unique(checklist);
}
