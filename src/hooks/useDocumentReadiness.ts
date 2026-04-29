import { useAuth } from "@/contexts/AuthContext";
import { DocumentReadinessEntry, DocumentReadinessSummary } from "@/lib/copilotTypes";
import { getRequiredDocuments } from "@/lib/documentRequirements";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type ReadinessStore = Record<string, DocumentReadinessEntry>;

const getStorageKey = (schemeId: string, userId?: string) =>
  `samarth-document-readiness:${userId ?? "guest"}:${schemeId}`;

function readStore(schemeId: string, userId?: string): ReadinessStore {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(getStorageKey(schemeId, userId));
    return raw ? (JSON.parse(raw) as ReadinessStore) : {};
  } catch {
    return {};
  }
}

function writeStore(schemeId: string, userId: string | undefined, store: ReadinessStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getStorageKey(schemeId, userId), JSON.stringify(store));
}

function buildSummary(category: string, store: ReadinessStore): DocumentReadinessSummary {
  const requiredDocs = getRequiredDocuments(category).map((doc) => doc.en);
  const entries = Object.values(store).sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt));
  const uploadedDocs = entries.map((entry) => entry.documentType);
  const verifiedDocs = entries
    .filter((entry) => entry.status === "VERIFIED" || entry.status === "ACCEPTED_WITH_WARNINGS")
    .map((entry) => entry.documentType);
  const missingDocs = requiredDocs.filter((doc) => !verifiedDocs.includes(doc));
  const qualityWarnings = entries.flatMap((entry) => entry.qualityWarnings).filter(Boolean);
  const completionPct = requiredDocs.length
    ? Math.round((verifiedDocs.length / requiredDocs.length) * 100)
    : 0;

  return {
    requiredDocs,
    uploadedDocs,
    verifiedDocs,
    missingDocs,
    qualityWarnings: [...new Set(qualityWarnings)],
    completionPct,
    entries,
  };
}

export function useDocumentReadiness(schemeId: string, category: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["document-readiness", user?.id, schemeId, category],
    queryFn: async () => buildSummary(category, readStore(schemeId, user?.id)),
  });

  const saveMutation = useMutation({
    mutationFn: async (entry: DocumentReadinessEntry) => {
      const store = readStore(schemeId, user?.id);
      store[entry.documentType] = entry;
      writeStore(schemeId, user?.id, store);
      return buildSummary(category, store);
    },
    onSuccess: (summary) => {
      queryClient.setQueryData(["document-readiness", user?.id, schemeId, category], summary);
    },
  });

  return {
    summary: query.data ?? buildSummary(category, {}),
    saveReadinessEntry: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}
