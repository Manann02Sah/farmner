export interface Scheme {
  id: string;
  title: string;
  description: string;
  category: string;
  state: string;
  benefits: string[];
  eligibility: string;
  status: "active" | "inactive";
  benefitType: string;
}

export const schemes: Scheme[] = [
  {
    id: "1",
    title: "PM-Kisan Samman Nidhi",
    description: "Direct income support of ₹6,000 per year to all landholding farm...",
    category: "Agriculture",
    state: "Central",
    benefits: ["₹6,000 Annual Benefit", "Direct Benefit Transfer"],
    eligibility: "Small and marginal landholder farmer families with land up to 2 hectares.",
    status: "active",
    benefitType: "Direct Cash",
  },
  {
    id: "2",
    title: "Startup India Seed Fund",
    description: "Financial assistance to startups for proof of concept, prototype...",
    category: "Startup",
    state: "Central",
    benefits: ["Up to ₹50 Lakh Equity", "Incubator Support"],
    eligibility: "DPIIT-recognized startups within 2 years of incorporation.",
    status: "active",
    benefitType: "Subsidies",
  },
  {
    id: "3",
    title: "Ayushman Bharat (PM-JAY)",
    description: "The world's largest health insurance scheme fully financed...",
    category: "Health",
    state: "Central",
    benefits: ["₹5 Lakh Health Cover", "Cashless Treatment"],
    eligibility: "Families identified based on SECC 2011 data.",
    status: "active",
    benefitType: "Insurance",
  },
  {
    id: "4",
    title: "Elevate Karnataka 2024",
    description: "Grant-in-aid for innovation and early-stage startups in emergin...",
    category: "Startup",
    state: "Karnataka",
    benefits: ["Early Stage Funding", "Mentor Access"],
    eligibility: "Karnataka-based startups in emerging technology sectors.",
    status: "active",
    benefitType: "Subsidies",
  },
  {
    id: "5",
    title: "Ujjwala Yojana 2.0",
    description: "Free LPG connections to women from BPL families to promote...",
    category: "Social Welfare",
    state: "Central",
    benefits: ["Free LPG Connection", "Refill Subsidy"],
    eligibility: "Women from Below Poverty Line households.",
    status: "active",
    benefitType: "Subsidies",
  },
  {
    id: "6",
    title: "Sustainable Agri-Tech Grant",
    description: "Direct financial assistance for purchasing high-efficiency irrigation systems.",
    category: "Agriculture",
    state: "Central",
    benefits: ["₹2.5L Subsidy", "Technical Support"],
    eligibility: "Farmers with minimum 1 hectare landholding.",
    status: "active",
    benefitType: "Direct Cash",
  },
];

export const categories = ["Agriculture", "Startup", "Health", "Social Welfare", "MSME", "Technology"];
export const states = ["Central", "Maharashtra", "Karnataka", "Punjab", "Tamil Nadu", "Rajasthan"];
export const benefitTypes = ["Direct Cash", "Subsidies", "Credit & Loan", "Insurance"];
