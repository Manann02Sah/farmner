import type { SchemeRow } from "@/hooks/useSchemes";

type SchemeTemplate = {
  key: string;
  title: string;
  description: string;
  category: string;
  eligibility: string;
  benefits: string[];
  benefitType: string;
  ministry: string;
  maxBenefit: string;
  websiteSlug: string;
};

const STATES = [
  "Punjab",
  "Haryana",
  "Uttar Pradesh",
  "Rajasthan",
  "Maharashtra",
  "Madhya Pradesh",
  "Bihar",
  "Gujarat",
  "Tamil Nadu",
  "Karnataka",
  "West Bengal",
];

const TEMPLATES: SchemeTemplate[] = [
  { key: "solar-pump", title: "Solar Pump Support", description: "Support for farmers adopting solar irrigation pumps and related infrastructure.", category: "Agriculture", eligibility: "Farmers with cultivable land and irrigation needs.", benefits: ["Capital subsidy", "Irrigation cost reduction", "Renewable energy support"], benefitType: "Subsidies", ministry: "Ministry of Agriculture and Farmers Welfare", maxBenefit: "Up to Rs. 3 lakh", websiteSlug: "solar-pump-support" },
  { key: "micro-irrigation", title: "Micro Irrigation Mission", description: "Support for drip, sprinkler, and efficient water management systems.", category: "Agriculture", eligibility: "Farmers and farmer groups adopting water-saving irrigation methods.", benefits: ["Drip irrigation support", "Sprinkler subsidy", "Water efficiency upgrade"], benefitType: "Subsidies", ministry: "Department of Agriculture and Farmers Welfare", maxBenefit: "40% to 70% assistance", websiteSlug: "micro-irrigation-mission" },
  { key: "crop-insurance", title: "Crop Insurance Protection", description: "Seasonal crop insurance support for notified crops and regions.", category: "Insurance", eligibility: "Farmers cultivating notified crops in eligible regions.", benefits: ["Premium support", "Weather risk cover", "Crop loss protection"], benefitType: "Insurance", ministry: "Ministry of Agriculture and Farmers Welfare", maxBenefit: "Coverage as per acreage", websiteSlug: "crop-insurance-protection" },
  { key: "soil-health", title: "Soil Health Assistance", description: "Support for soil testing, nutrient planning, and balanced farm input use.", category: "Agriculture", eligibility: "Farmers and collectives improving soil health practices.", benefits: ["Soil testing support", "Nutrient guidance", "Balanced input use"], benefitType: "Subsidies", ministry: "Department of Agriculture Cooperation", maxBenefit: "As per local sanction", websiteSlug: "soil-health-assistance" },
  { key: "fpo-support", title: "Farmer Producer Organization Support", description: "Infrastructure and market linkage support for FPOs and producer groups.", category: "Agriculture", eligibility: "Registered FPOs, producer collectives, and cooperatives.", benefits: ["Capacity building", "Storage support", "Market linkage"], benefitType: "Credit & Loan", ministry: "Ministry of Agriculture and Farmers Welfare", maxBenefit: "Up to Rs. 15 lakh", websiteSlug: "fpo-support" },
  { key: "kisan-credit", title: "Kisan Credit Expansion", description: "Working capital support for seasonal crop and allied activities.", category: "Credit", eligibility: "Eligible farmers, tenant cultivators, and allied operators meeting bank norms.", benefits: ["Working capital", "Short-term crop credit", "Interest support"], benefitType: "Credit & Loan", ministry: "Department of Financial Services", maxBenefit: "As per bank eligibility", websiteSlug: "kisan-credit-expansion" },
  { key: "agri-processing", title: "Agri Processing Upgrade", description: "Assistance for farm-gate processing, grading, and storage units.", category: "MSME", eligibility: "Agri entrepreneurs, FPO-backed units, and registered micro enterprises.", benefits: ["Machinery support", "Storage support", "Value addition"], benefitType: "Subsidies", ministry: "Ministry of Food Processing Industries", maxBenefit: "Up to Rs. 20 lakh", websiteSlug: "agri-processing-upgrade" },
  { key: "women-enterprise", title: "Women Enterprise Support", description: "Business setup and livelihood support for women-led enterprises.", category: "Women & Child", eligibility: "Women entrepreneurs, SHGs, and women-led micro enterprises.", benefits: ["Enterprise support", "Skill enablement", "Working capital linkage"], benefitType: "Subsidies", ministry: "Ministry of Women and Child Development", maxBenefit: "Up to Rs. 10 lakh", websiteSlug: "women-enterprise-support" },
  { key: "student-scholarship", title: "Student Scholarship Access", description: "Scholarship support for low-income students and priority categories.", category: "Education", eligibility: "Students with enrollment proof, identity documents, and income eligibility.", benefits: ["Tuition support", "DBT scholarship", "Education continuity support"], benefitType: "Direct Cash", ministry: "Ministry of Education", maxBenefit: "Up to Rs. 75000 per year", websiteSlug: "student-scholarship-access" },
  { key: "rural-housing", title: "Rural Housing Support", description: "Support for rural house construction and housing-linked amenities.", category: "Housing", eligibility: "Eligible rural households meeting housing and income criteria.", benefits: ["Housing support", "Installment release", "Amenity linkage"], benefitType: "Direct Cash", ministry: "Ministry of Rural Development", maxBenefit: "As per housing category", websiteSlug: "rural-housing-support" },
  { key: "health-cover", title: "Household Health Cover", description: "Financial protection support for hospitalization and select procedures.", category: "Health", eligibility: "Eligible beneficiary households under notified health programs.", benefits: ["Hospitalization cover", "Cashless treatment", "Family health support"], benefitType: "Insurance", ministry: "Ministry of Health and Family Welfare", maxBenefit: "Up to Rs. 5 lakh", websiteSlug: "household-health-cover" },
  { key: "dairy-support", title: "Dairy Enterprise Support", description: "Support for small dairy units, chilling, and milk handling systems.", category: "Agriculture", eligibility: "Dairy farmers, cooperatives, and small livestock entrepreneurs.", benefits: ["Livestock support", "Milk handling equipment", "Cold chain support"], benefitType: "Subsidies", ministry: "Department of Animal Husbandry and Dairying", maxBenefit: "Up to Rs. 12 lakh", websiteSlug: "dairy-enterprise-support" },
  { key: "fisheries-support", title: "Fisheries Livelihood Support", description: "Support for fish farming, hatcheries, and cold-chain facilities.", category: "Agriculture", eligibility: "Fish farmers, fisheries groups, and eligible aquaculture units.", benefits: ["Pond support", "Cold chain support", "Input support"], benefitType: "Subsidies", ministry: "Department of Fisheries", maxBenefit: "Up to Rs. 18 lakh", websiteSlug: "fisheries-livelihood-support" },
  { key: "food-processing", title: "Food Processing Cluster Support", description: "Support for processing clusters, branding, and market access.", category: "MSME", eligibility: "Food processing units, producer groups, and rural enterprises.", benefits: ["Cluster support", "Packaging support", "Market linkage"], benefitType: "Subsidies", ministry: "Ministry of Food Processing Industries", maxBenefit: "Up to Rs. 25 lakh", websiteSlug: "food-processing-cluster-support" },
  { key: "startup-seed", title: "Startup Seed Access", description: "Seed-stage support for innovation and rural impact startups.", category: "Startup", eligibility: "Recognized startups with compliant registration and early-stage plans.", benefits: ["Seed capital", "Mentorship", "Pilot support"], benefitType: "Direct Cash", ministry: "Department for Promotion of Industry and Internal Trade", maxBenefit: "Up to Rs. 50 lakh", websiteSlug: "startup-seed-access" },
  { key: "artisan-credit", title: "Artisan Working Capital Support", description: "Working capital and equipment support for artisans and local makers.", category: "Credit", eligibility: "Registered artisans, self-employed workers, and eligible producer groups.", benefits: ["Working capital", "Tool purchase support", "Market linkage"], benefitType: "Credit & Loan", ministry: "Ministry of MSME", maxBenefit: "Up to Rs. 5 lakh", websiteSlug: "artisan-working-capital-support" },
  { key: "self-help-group", title: "Self Help Group Enterprise Grant", description: "Enterprise support for self-help groups expanding local livelihoods.", category: "Women & Child", eligibility: "Registered SHGs and women-led collective enterprises.", benefits: ["Enterprise grant", "Group equipment support", "Market linkage"], benefitType: "Direct Cash", ministry: "Ministry of Rural Development", maxBenefit: "Up to Rs. 8 lakh", websiteSlug: "self-help-group-enterprise-grant" },
  { key: "skill-youth", title: "Youth Skill Development Grant", description: "Support for job-linked skill development and certification.", category: "Education", eligibility: "Youth applicants with identity documents and eligibility under training norms.", benefits: ["Training support", "Certification support", "Placement linkage"], benefitType: "Direct Cash", ministry: "Ministry of Skill Development and Entrepreneurship", maxBenefit: "Up to Rs. 50000", websiteSlug: "youth-skill-development-grant" },
  { key: "urban-housing", title: "Affordable Urban Housing Support", description: "Support for home improvement and affordable urban housing assistance.", category: "Housing", eligibility: "Eligible low-income urban households and beneficiaries under notified categories.", benefits: ["Home improvement support", "Housing subsidy", "Basic services linkage"], benefitType: "Direct Cash", ministry: "Ministry of Housing and Urban Affairs", maxBenefit: "As per housing norms", websiteSlug: "affordable-urban-housing-support" },
  { key: "maternal-health", title: "Maternal and Child Health Benefit", description: "Support for maternal care, child nutrition, and institutional health access.", category: "Health", eligibility: "Eligible pregnant women, mothers, and beneficiary households.", benefits: ["Maternal benefit", "Nutrition support", "Health facility linkage"], benefitType: "Direct Cash", ministry: "Ministry of Health and Family Welfare", maxBenefit: "As per program norms", websiteSlug: "maternal-child-health-benefit" },
];

const LOCAL_SCHEME_CATALOG: SchemeRow[] = TEMPLATES.flatMap((template) =>
  STATES.map((state, index) => ({
    id: `local-${template.key}-${state.toLowerCase().replace(/\s+/g, "-")}`,
    external_id: `seed-${template.key}-${state.toLowerCase().replace(/\s+/g, "-")}`,
    title: `${template.title} - ${state}`,
    description: `${template.description} This version is intended for applicants in ${state}.`,
    category: template.category,
    state,
    eligibility: template.eligibility,
    benefits: template.benefits,
    benefit_type: template.benefitType,
    status: "active",
    ministry: template.ministry,
    max_benefit: template.maxBenefit,
    application_deadline: null,
    website_url: `https://example.gov.in/schemes/${template.websiteSlug}/${state.toLowerCase().replace(/\s+/g, "-")}`,
    created_at: `2026-04-${String((index % 28) + 1).padStart(2, "0")}`,
  })),
);

export function getLocalSchemeCatalog() {
  return LOCAL_SCHEME_CATALOG;
}

