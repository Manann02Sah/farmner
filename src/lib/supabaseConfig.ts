const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID?.trim() ?? "";
const explicitUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

function buildSupabaseUrl(id: string) {
  return id ? `https://${id}.supabase.co` : "";
}

export function getSupabaseUrl() {
  return explicitUrl || buildSupabaseUrl(projectId);
}

export function getSupabaseProjectId() {
  if (projectId) return projectId;

  const match = getSupabaseUrl().match(/^https:\/\/([a-z0-9-]+)\.supabase\.co$/i);
  return match?.[1] ?? "";
}

export function getSupabaseFunctionUrl(functionName: string) {
  const baseUrl = getSupabaseUrl();
  return baseUrl ? `${baseUrl}/functions/v1/${functionName}` : "";
}

export function getSupabasePublishableKey() {
  return publishableKey;
}

export function hasSupabaseConfig() {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}
