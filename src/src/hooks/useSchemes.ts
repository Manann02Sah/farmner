import { supabase } from "@/integrations/supabase/client";
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
      return data as SchemeRow[];
    },
  });
}

export function useSchemeCategories() {
  return useQuery({
    queryKey: ["scheme-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schemes")
        .select("category")
        .eq("status", "active");
      if (error) throw error;
      const cats = [...new Set(data.map((d: { category: string }) => d.category))].sort();
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
        .select("state")
        .eq("status", "active");
      if (error) throw error;
      const states = [...new Set(data.map((d: { state: string }) => d.state))].sort();
      return states;
    },
  });
}
