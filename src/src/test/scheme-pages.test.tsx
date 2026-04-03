import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import SchemeExplorer from "@/pages/SchemeExplorer";
import SchemeDetails from "@/pages/SchemeDetails";

const mockSchemes = [
  {
    id: "scheme-1",
    title: "Solar Pump Subsidy",
    description: "Subsidy support for farmers installing solar irrigation pumps.",
    category: "Agriculture",
    state: "Punjab",
    benefit_type: "Subsidies",
    max_benefit: "Up to Rs. 2 lakh",
    eligibility: "Farmers with cultivable land",
    website_url: "https://example.com/solar-pump",
    benefits: ["Solar pump support", "Irrigation upgrade support"],
    ministry: "Ministry of Agriculture",
    application_deadline: null,
    external_id: null,
    status: "active",
    created_at: "2025-01-01",
  },
];

const translations: Record<string, string> = {
  "chat.title": "AI Chat",
  "dash.startNewApp": "Start New Application",
  "nav.schemes": "Schemes",
  "nav.dashboard": "Dashboard",
  "schemes.title": "Scheme Explorer",
  "schemes.subtitle": "Scheme subtitle",
  "schemes.search": "Search",
  "schemes.gridView": "Grid View",
  "schemes.listView": "List View",
  "schemes.benefitType": "Benefit Type",
  "schemes.maxBenefit": "Max Benefit:",
  "schemes.viewDetails": "View Scheme Details",
  "schemes.selectedCompare": "Selected for Compare",
  "schemes.compareNow": "Compare Now",
  "schemes.comparisonActive": "Comparison Active",
  "schemes.schemesSelected": "Schemes Selected",
  "schemes.cantFind": "Can't find",
  "schemes.letAI": "Let AI help",
  "schemes.talkAI": "Talk to AI",
  "schemes.verifyDocs": "Verify Documents",
  "schemes.schemesCount": "schemes",
  "schemes.selectAtLeast2": "Select at least 2 schemes to compare",
  "dash.compareSchemes": "Compare Schemes",
  "dash.savedSchemes": "Saved Schemes",
  "sidebar.documents": "Documents",
  "common.allCategories": "All Categories",
  "common.allStates": "All States",
  "common.clearAll": "Clear All",
  "compare.back": "Back to Schemes",
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    language: "en",
    t: (key: string) => translations[key] ?? key,
  }),
}));

vi.mock("@/hooks/useSchemes", () => ({
  useSchemes: () => ({ data: mockSchemes, isLoading: false }),
  useSchemeCategories: () => ({ data: ["Agriculture"] }),
  useSchemeStates: () => ({ data: ["Punjab"] }),
}));

vi.mock("@/hooks/useSavedSchemes", () => ({
  useSavedSchemes: () => ({ data: [] }),
  useSaveScheme: () => ({ mutate: vi.fn() }),
  useUnsaveScheme: () => ({ mutate: vi.fn() }),
}));

describe("scheme explorer and detail pages", () => {
  it("opens a real scheme detail page from the scheme card", async () => {
    render(
      <MemoryRouter initialEntries={["/schemes"]}>
        <Routes>
          <Route path="/schemes" element={<SchemeExplorer />} />
          <Route path="/schemes/:schemeId" element={<SchemeDetails />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("View Scheme Details"));

    expect(await screen.findByText("Solar Pump Subsidy")).toBeInTheDocument();
    expect(screen.getByText("Farmers with cultivable land")).toBeInTheDocument();
  });

  it("uses a separate compare control on the scheme card", () => {
    render(
      <MemoryRouter initialEntries={["/schemes"]}>
        <Routes>
          <Route path="/schemes" element={<SchemeExplorer />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("Compare Schemes"));

    expect(screen.getByText("Comparison Active")).toBeInTheDocument();
  });
});
