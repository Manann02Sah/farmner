import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export function useSavedSchemes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["saved-schemes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_schemes")
        .select("*, schemes(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveScheme() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schemeId: string) => {
      if (!user) throw new Error("Must be logged in");
      const { error } = await supabase
        .from("saved_schemes")
        .insert({ user_id: user.id, scheme_id: schemeId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-schemes"] });
    },
  });
}

export function useUnsaveScheme() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schemeId: string) => {
      if (!user) throw new Error("Must be logged in");
      const { error } = await supabase
        .from("saved_schemes")
        .delete()
        .eq("user_id", user.id)
        .eq("scheme_id", schemeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-schemes"] });
    },
  });
}
