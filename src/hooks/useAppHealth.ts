import { useMemo } from "react";
import { hasSupabaseConfig } from "@/lib/supabaseConfig";

export function useAppHealth() {
  return useMemo(
    () => ({
      hasSupabaseConfig: hasSupabaseConfig(),
    }),
    [],
  );
}
