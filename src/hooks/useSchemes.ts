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

function mergeWithFallbackSchemes(remoteSchemes: SchemeRow[]) {
  if (remoteSchemes.length >= MINIMUM_SCHEME_CATALOG_SIZE) {
    return remoteSchemes;
  }

  const merged = new Map<string, SchemeRow>();

  for (const scheme of remoteSchemes) {
    const key = scheme.external_id ?? scheme.id;
    merged.set(key, scheme);
  }

  for (const scheme of getLocalSchemeCatalog()) {
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
      let query = supabase
        .from("schemes")
        .select("*")
        .eq("status", "active")
        .order("title");

      if (filters?.category && filters.category !== "All Categories") {
        query = query.eq("category", filters.category);
      }
      if (filters?.state && filters.state !== "All States") {
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
      return mergeWithFallbackSchemes((data as SchemeRow[]) ?? []);
    },
  });
}

export function useSchemeCategories() {
  return useQuery({
    queryKey: ["scheme-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schemes")
        .select("*")
        .eq("status", "active");
      if (error) throw error;
      const merged = mergeWithFallbackSchemes((data as SchemeRow[]) ?? []);
      const cats = [...new Set(merged.map((scheme) => scheme.category))].sort();
      return cats;
    },
  });
}

export function useSchemeStates() {
  return useQuery({
    queryKey: ["scheme-states"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schemes")
        .select("*")
        .eq("status", "active");
      if (error) throw error;
      const merged = mergeWithFallbackSchemes((data as SchemeRow[]) ?? []);
      const states = [...new Set(merged.map((scheme) => scheme.state))].sort();
      return states;
    },
  });
}
