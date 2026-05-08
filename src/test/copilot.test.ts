import { describe, expect, it } from "vitest";
import { buildApplicationDossier } from "@/lib/applicationDossier";
import { decideRecommendationVisibility } from "@/lib/chatRecommendations";
import { assessSchemeEligibility, buildProfileSearchText } from "@/lib/copilot";
import { findRelevantSchemes } from "@/lib/schemeMatching";

const scheme = {
  id: "scheme-1",
  external_id: null,
  title: "Solar Pump Subsidy",
  description: "Subsidy for farmers who want solar irrigation support in Punjab.",
  category: "Agriculture",
  state: "Punjab",
  eligibility: "Farmers with cultivable land and valid bank details.",
  benefits: ["Solar irrigation support"],
  benefit_type: "Subsidies",
  status: "active",
  ministry: "Ministry of Agriculture",
  max_benefit: "Up to Rs. 2 lakh",
  application_deadline: null,
  website_url: null,
  created_at: "2026-01-01",
};

const profile = {
  displayName: "Ravi",
  state: "Punjab",
  location: "Ludhiana",
  category: "General",
  landholding: "2 acres",
  cropType: "Wheat",
  incomeBand: "Rs. 1-3 lakh",
  businessType: "Farmer",
  preferredLanguage: "en" as const,
  savedCrops: ["Wheat"],
};

describe("application copilot logic", () => {
  it("returns a stable eligibility assessment for the same inputs", () => {
    const first = assessSchemeEligibility(scheme, profile);
    const second = assessSchemeEligibility(scheme, profile);

    expect(first).toEqual(second);
    expect(first.status).toBe("likely_eligible");
    expect(first.confidence).toBeGreaterThan(60);
  });

  it("creates explainable recommendation context using profile signals", () => {
    const matches = findRelevantSchemes(
      [scheme],
      `find irrigation support ${buildProfileSearchText(profile)}`,
      1,
      { profile },
    );

    expect(matches).toHaveLength(1);
    expect(matches[0].recommendationContext?.usedProfile.join(" ")).toContain("Punjab");
    expect(matches[0].recommendationContext?.whyMatched.length).toBeGreaterThan(0);
  });

  it("keeps recommendations hidden for vague early conversation", () => {
    const matches = findRelevantSchemes([scheme], "hello i need some help", 3, { profile: null });
    const decision = decideRecommendationVisibility({
      messages: [{ role: "user", content: "Hello, I need help." }],
      matches,
      profile: null,
    });

    expect(decision.mode).toBe("none");
  });

  it("shows recommendations for explicit scheme requests", () => {
    const matches = findRelevantSchemes(
      [scheme],
      `what schemes can i apply for in punjab for irrigation ${buildProfileSearchText(profile)}`,
      3,
      { profile },
    );
    const decision = decideRecommendationVisibility({
      messages: [{ role: "user", content: "What schemes can I apply for in Punjab for irrigation?" }],
      matches,
      profile,
    });

    expect(decision.mode).toBe("explicit_request");
    expect(decision.schemeCatalog.length).toBeGreaterThan(0);
  });

  it("prioritizes Hindi state mentions when matching schemes", () => {
    const haryanaScheme = {
      ...scheme,
      id: "scheme-2",
      title: "Canal Irrigation Support",
      state: "Haryana",
      description: "Irrigation support for eligible farmers in Haryana.",
    };

    const matches = findRelevantSchemes(
      [haryanaScheme, scheme],
      "मुझे पंजाब में योजनाएं बताओ",
      2,
      { profile: null },
    );

    expect(matches).toHaveLength(1);
    expect(matches[0].state).toBe("Punjab");
  });

  it("builds a dossier with scheme, eligibility, and readiness sections", () => {
    const assessment = assessSchemeEligibility(scheme, profile, {
      requiredDocs: ["Aadhaar Card", "Land Ownership Document"],
      uploadedDocs: ["Aadhaar Card"],
      verifiedDocs: ["Aadhaar Card"],
      missingDocs: ["Land Ownership Document"],
      qualityWarnings: [],
      completionPct: 50,
      entries: [
        {
          documentType: "Aadhaar Card",
          fileName: "aadhaar.pdf",
          status: "VERIFIED",
          confidence: 94,
          qualityWarnings: [],
          detectedFields: ["name"],
          missingFields: [],
          uploadedAt: "2026-01-10T10:00:00.000Z",
        },
      ],
    });

    const dossier = buildApplicationDossier({
      scheme,
      profile,
      assessment,
      readiness: {
        requiredDocs: ["Aadhaar Card", "Land Ownership Document"],
        uploadedDocs: ["Aadhaar Card"],
        verifiedDocs: ["Aadhaar Card"],
        missingDocs: ["Land Ownership Document"],
        qualityWarnings: [],
        completionPct: 50,
        entries: [
          {
            documentType: "Aadhaar Card",
            fileName: "aadhaar.pdf",
            status: "VERIFIED",
            confidence: 94,
            qualityWarnings: [],
            detectedFields: ["name"],
            missingFields: [],
            uploadedAt: "2026-01-10T10:00:00.000Z",
          },
        ],
      },
    });

    expect(dossier.sections.map((section) => section.title)).toEqual(
      expect.arrayContaining(["Scheme snapshot", "Eligibility scorecard", "Document readiness"]),
    );
    expect(dossier.readinessPct).toBe(50);
    expect(dossier.confidence).toBeGreaterThan(0);
  });
});
