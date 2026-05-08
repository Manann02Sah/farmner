import { supabase } from "@/integrations/supabase/client";
import { getLocalSchemeCatalog } from "@/lib/localSchemeCatalog";
import { useQuery } from "@tanstack/react-query";

export interface SchemeRow {
  id: string;
  external_id: string | null;
  title: string;
  description: string;
  category: string;
  state: string;
  eligibility: string | null;
  benefits: string[];
  benefit_type: string;
  status: string;
  ministry: string | null;
  max_benefit: string | null;
  application_deadline: string | null;
  website_url: string | null;
  created_at: string;
}

const MINIMUM_SCHEME_CATALOG_SIZE = 200;
const ALL_CATEGORIES_FILTER = "ALL_CATEGORIES";
const ALL_STATES_FILTER = "ALL_STATES";

function normalizeSchemeRow(scheme: SchemeRow): SchemeRow {
  return {
    ...scheme,
    benefits: Array.isArray(scheme.benefits) ? scheme.benefits : [],
    eligibility: scheme.eligibility ?? null,
    ministry: scheme.ministry ?? null,
    max_benefit: scheme.max_benefit ?? null,
    application_deadline: scheme.application_deadline ?? null,
    website_url: scheme.website_url ?? null,
  };
}

function applySchemeFilters(
  schemes: SchemeRow[],
  filters?: {
    category?: string;
    state?: string;
    benefitType?: string;
    search?: string;
  },
) {
  const normalizedSearch = filters?.search?.trim().toLowerCase();
  const normalizedCategory = filters?.category?.trim();
  const normalizedState = filters?.state?.trim();
  const normalizedBenefitType = filters?.benefitType?.trim();

  return schemes.filter((scheme) => {
    if (
      normalizedCategory &&
      normalizedCategory !== "All Categories" &&
      normalizedCategory !== ALL_CATEGORIES_FILTER &&
      scheme.category !== normalizedCategory
    ) {
      return false;
    }

    if (
      normalizedState &&
      normalizedState !== "All States" &&
      normalizedState !== ALL_STATES_FILTER &&
      scheme.state !== normalizedState
    ) {
      return false;
    }

    if (normalizedBenefitType && scheme.benefit_type !== normalizedBenefitType) {
      return false;
    }

    if (normalizedSearch) {
      const haystack = [
        scheme.title,
        scheme.description,
        scheme.category,
        scheme.state,
        scheme.benefit_type,
        scheme.eligibility ?? "",
        scheme.ministry ?? "",
        ...(scheme.benefits ?? []),
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(normalizedSearch)) {
        return false;
      }
    }

    return true;
  });
}

function mergeWithFallbackSchemes(remoteSchemes: SchemeRow[]) {
  if (remoteSchemes.length >= MINIMUM_SCHEME_CATALOG_SIZE) {
    return remoteSchemes.map(normalizeSchemeRow);
  }

  const merged = new Map<string, SchemeRow>();

  for (const scheme of remoteSchemes.map(normalizeSchemeRow)) {
    const key = scheme.external_id ?? scheme.id;
    merged.set(key, scheme);
  }

  for (const scheme of getLocalSchemeCatalog().map(normalizeSchemeRow)) {
    const key = scheme.external_id ?? scheme.id;
    if (!merged.has(key)) {
      merged.set(key, scheme);
    }
  }

  return [...merged.values()].sort((a, b) => a.title.localeCompare(b.title));
}

export function useSchemes(filters?: {
  category?: string;
  state?: string;
  benefitType?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["schemes", filters],
    queryFn: async () => {
      try {
        let query = supabase
          .from("schemes")
          .select("*")
          .eq("status", "active")
          .order("title");

        if (
          filters?.category &&
          filters.category !== "All Categories" &&
          filters.category !== ALL_CATEGORIES_FILTER
        ) {
          query = query.eq("category", filters.category);
        }
        if (
          filters?.state &&
          filters.state !== "All States" &&
          filters.state !== ALL_STATES_FILTER
        ) {
          query = query.eq("state", filters.state);
        }
        if (filters?.benefitType) {
          query = query.eq("benefit_type", filters.benefitType);
        }
        if (filters?.search) {
          query = query.ilike("title", `%${filters.search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return applySchemeFilters(mergeWithFallbackSchemes((data as SchemeRow[]) ?? []), filters).sort((a, b) =>
          a.title.localeCompare(b.title),
        );
      } catch (error) {
        console.warn("Falling back to local scheme catalog because Supabase schemes query failed.", error);
        return applySchemeFilters(getLocalSchemeCatalog().map(normalizeSchemeRow), filters).sort((a, b) =>
          a.title.localeCompare(b.title),
        );
      }
    },
  });
}

export function useSchemeCategories() {
  return useQuery({
    queryKey: ["scheme-categories"],
    queryFn: async () => {
      let merged: SchemeRow[];

      try {
        const { data, error } = await supabase
          .from("schemes")
          .select("*")
          .eq("status", "active");
        if (error) throw error;
        merged = mergeWithFallbackSchemes((data as SchemeRow[]) ?? []);
      } catch (error) {
        console.warn("Falling back to local categories because Supabase schemes query failed.", error);
        merged = getLocalSchemeCatalog().map(normalizeSchemeRow);
      }

      const cats = [...new Set(merged.map((scheme) => scheme.category))].sort();
      return cats;
    },
  });
}

export function useSchemeStates() {
  return useQuery({
    queryKey: ["scheme-states"],
    queryFn: async () => {
      let merged: SchemeRow[];

      try {
        const { data, error } = await supabase
          .from("schemes")
          .select("*")
          .eq("status", "active");
        if (error) throw error;
        merged = mergeWithFallbackSchemes((data as SchemeRow[]) ?? []);
      } catch (error) {
        console.warn("Falling back to local states because Supabase schemes query failed.", error);
        merged = getLocalSchemeCatalog().map(normalizeSchemeRow);
      }

      const states = [...new Set(merged.map((scheme) => scheme.state))].sort();
      return states;
    },
  });
}
