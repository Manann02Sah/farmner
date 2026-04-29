import { useAuth } from "@/contexts/AuthContext";
import { FarmerProfile } from "@/lib/copilotTypes";
import { createEmptyProfile } from "@/lib/copilot";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const getProfileStorageKey = (userId?: string) => `samarth-farmer-profile:${userId ?? "guest"}`;

function readStoredProfile(userId?: string) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(getProfileStorageKey(userId));
    return raw ? (JSON.parse(raw) as Partial<FarmerProfile>) : null;
  } catch {
    return null;
  }
}

function writeStoredProfile(userId: string | undefined, profile: FarmerProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getProfileStorageKey(userId), JSON.stringify(profile));
}

function mergeProfile(
  base: FarmerProfile,
  incoming?: Partial<FarmerProfile> | null,
) {
  if (!incoming) return base;

  return {
    ...base,
    ...incoming,
    savedCrops: Array.isArray(incoming.savedCrops) ? incoming.savedCrops : base.savedCrops,
    preferredLanguage: incoming.preferredLanguage ?? base.preferredLanguage,
  };
}

export function useFarmerProfile(language: "en" | "hi") {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["farmer-profile", user?.id, language],
    queryFn: async () => {
      const initial = mergeProfile(createEmptyProfile(language), readStoredProfile(user?.id));

      if (!user) {
        return initial;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        const remote = data
          ? {
              displayName: data.display_name ?? "",
              state: data.location ?? "",
              location: data.location ?? "",
              category: data.category ?? "",
              landholding: data.landholding ?? "",
            }
          : null;

        const merged = mergeProfile(initial, remote);
        writeStoredProfile(user.id, merged);
        return merged;
      } catch (error) {
        console.warn("Falling back to stored farmer profile.", error);
        return initial;
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (updates: Partial<FarmerProfile>) => {
      const next = mergeProfile(query.data ?? createEmptyProfile(language), updates);
      writeStoredProfile(user?.id, next);

      if (user) {
        try {
          const { error } = await supabase.from("profiles").upsert({
            user_id: user.id,
            display_name: next.displayName || null,
            location: next.state || next.location || null,
            category: next.category || null,
            landholding: next.landholding || null,
          });

          if (error) throw error;
        } catch (error) {
          console.warn("Profile could not be synced to Supabase.", error);
        }
      }

      return next;
    },
    onSuccess: (next) => {
      queryClient.setQueryData(["farmer-profile", user?.id, language], next);
    },
  });

  return {
    profile: query.data ?? createEmptyProfile(language),
    isLoading: query.isLoading,
    saveProfile: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}
