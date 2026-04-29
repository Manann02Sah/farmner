import { jsPDF } from "jspdf";
import { buildCopilotChecklist } from "@/lib/copilot";
import {
  DocumentReadinessSummary,
  EligibilityAssessment,
  FarmerProfile,
} from "@/lib/copilotTypes";
import { SchemeRow } from "@/hooks/useSchemes";

export type DossierSection = {
  title: string;
  lines: string[];
};

export type ApplicationDossier = {
  title: string;
  subtitle: string;
  schemeTitle: string;
  readinessPct: number;
  confidence: number;
  generatedAt: string;
  sections: DossierSection[];
};

export type DossierExportOptions = {
  scheme: SchemeRow;
  profile?: Partial<FarmerProfile> | null;
  readiness: DocumentReadinessSummary;
  assessment: EligibilityAssessment;
  checklist?: string[];
};

const unique = (items: string[]) => [...new Set(items.filter(Boolean))];

const safe = (value?: string | null) => (value && value.trim() ? value : "Not provided");

function buildProfileSection(profile?: Partial<FarmerProfile> | null) {
  const current = profile ?? {};

  return {
    title: "Farmer profile snapshot",
    lines: [
      `Name: ${safe(current.displayName)}`,
      `State: ${safe(current.state)}`,
      `Location: ${safe(current.location)}`,
      `Category: ${safe(current.category)}`,
      `Landholding: ${safe(current.landholding)}`,
      `Crop focus: ${safe(current.cropType)}`,
      `Income band: ${safe(current.incomeBand)}`,
      `Business type: ${safe(current.businessType)}`,
    ],
  };
}

function buildReadinessLines(readiness: DocumentReadinessSummary) {
  return readiness.requiredDocs.map((documentType) => {
    const entry = readiness.entries.find((item) => item.documentType === documentType);
    if (!entry) {
      return `${documentType}: Missing`;
    }

    const notes = [
      entry.fileName ? `File: ${entry.fileName}` : "",
      entry.qualityWarnings.length ? `Warnings: ${entry.qualityWarnings.join(", ")}` : "",
      entry.missingFields.length ? `Missing fields: ${entry.missingFields.join(", ")}` : "",
      entry.manualOverride ? "Accepted with manual review" : "",
    ].filter(Boolean);

    return `${documentType}: ${entry.status.replace(/_/g, " ")}${notes.length ? ` | ${notes.join(" | ")}` : ""}`;
  });
}

export function buildApplicationDossier({
  scheme,
  profile,
  readiness,
  assessment,
  checklist,
}: DossierExportOptions): ApplicationDossier {
  const finalChecklist = checklist && checklist.length ? checklist : buildCopilotChecklist(scheme, assessment, readiness);

  const sections: DossierSection[] = [
    {
      title: "Scheme snapshot",
      lines: [
        `Scheme: ${scheme.title}`,
        `Category: ${scheme.category}`,
        `State: ${scheme.state}`,
        `Benefit type: ${scheme.benefit_type}`,
        `Maximum benefit: ${scheme.max_benefit ?? "Not specified"}`,
        `Deadline: ${scheme.application_deadline ?? "Open or not specified"}`,
        `Ministry: ${scheme.ministry ?? "Not specified"}`,
        `Official link: ${scheme.website_url ?? "Not provided"}`,
      ],
    },
    buildProfileSection(profile),
    {
      title: "Eligibility scorecard",
      lines: unique([
        `Status: ${assessment.status.replace(/_/g, " ")}`,
        `Confidence: ${assessment.confidence}%`,
        `Summary: ${assessment.explanation}`,
        ...assessment.matchedCriteria.map((item) => `Matched: ${item}`),
        ...assessment.missingCriteria.map((item) => `Missing: ${item}`),
        ...assessment.risks.map((item) => `Risk: ${item}`),
      ]),
    },
    {
      title: "Document readiness",
      lines: [
        `Completion: ${readiness.completionPct}%`,
        `Verified documents: ${readiness.verifiedDocs.length ? readiness.verifiedDocs.join(", ") : "None yet"}`,
        `Missing documents: ${readiness.missingDocs.length ? readiness.missingDocs.join(", ") : "None"}`,
        ...buildReadinessLines(readiness),
      ],
    },
    {
      title: "Next best actions",
      lines: unique([
        ...assessment.nextSteps,
        ...finalChecklist,
      ]),
    },
  ];

  return {
    title: "Application Dossier",
    subtitle: "A reviewer-ready summary generated from scheme, profile, and document-readiness data.",
    schemeTitle: scheme.title,
    readinessPct: readiness.completionPct,
    confidence: assessment.confidence,
    generatedAt: new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    sections,
  };
}

export function exportApplicationDossierPdf(dossier: ApplicationDossier) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - margin) return;
    doc.addPage();
    y = margin;
  };

  const writeWrappedText = (text: string, size = 11, color: [number, number, number] = [52, 57, 70]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, contentWidth);
    ensureSpace(lines.length * (size + 4));
    doc.text(lines, margin, y);
    y += lines.length * (size + 4) + 6;
  };

  doc.setFillColor(19, 77, 72);
  doc.roundedRect(margin, y, contentWidth, 108, 18, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(dossier.title, margin + 20, y + 32);
  doc.setFontSize(15);
  doc.text(dossier.schemeTitle, margin + 20, y + 56);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(dossier.subtitle, margin + 20, y + 76);
  doc.text(`Generated: ${dossier.generatedAt}`, margin + 20, y + 92);

  doc.setFillColor(240, 247, 244);
  doc.roundedRect(pageWidth - margin - 160, y + 18, 140, 70, 16, 16, "F");
  doc.setTextColor(19, 77, 72);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Eligibility ${dossier.confidence}%`, pageWidth - margin - 145, y + 45);
  doc.text(`Readiness ${dossier.readinessPct}%`, pageWidth - margin - 145, y + 68);

  y += 132;

  for (const section of dossier.sections) {
    ensureSpace(64);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, contentWidth, 30, 12, 12, "F");
    doc.setTextColor(19, 77, 72);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(section.title, margin + 14, y + 20);
    y += 42;

    for (const line of section.lines) {
      writeWrappedText(`- ${line}`);
    }

    y += 4;
  }

  return doc;
}
