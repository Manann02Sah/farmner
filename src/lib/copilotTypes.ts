export type FarmerProfile = {
  displayName: string;
  state: string;
  location: string;
  category: string;
  landholding: string;
  cropType: string;
  incomeBand: string;
  businessType: string;
  preferredLanguage: "en" | "hi";
  savedCrops: string[];
};

export type EligibilityStatus = "likely_eligible" | "needs_info" | "at_risk";

export type EligibilityAssessment = {
  status: EligibilityStatus;
  confidence: number;
  matchedCriteria: string[];
  missingCriteria: string[];
  risks: string[];
  nextSteps: string[];
  recommendedDocuments: string[];
  profileSignals: string[];
  explanation: string;
};

export type RecommendationContext = {
  whyMatched: string[];
  usedProfile: string[];
  unknowns: string[];
  risks: string[];
  score: number;
};

export type DocumentReadinessEntry = {
  documentType: string;
  fileName: string;
  status: "VERIFIED" | "NEEDS_REVIEW" | "REJECTED" | "ACCEPTED_WITH_WARNINGS";
  confidence: number;
  qualityWarnings: string[];
  detectedFields: string[];
  missingFields: string[];
  uploadedAt: string;
  manualOverride?: boolean;
};

export type DocumentReadinessSummary = {
  requiredDocs: string[];
  uploadedDocs: string[];
  verifiedDocs: string[];
  missingDocs: string[];
  qualityWarnings: string[];
  completionPct: number;
  entries: DocumentReadinessEntry[];
};
