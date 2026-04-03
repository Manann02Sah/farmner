import { supabase } from "@/integrations/supabase/client";

type AuthHeadersGetter = () => Promise<Record<string, string>>;

function extractErrorMessage(data: unknown, fallbackMessage: string) {
  if (data && typeof data === "object" && typeof (data as Record<string, unknown>).error === "string") {
    return ((data as Record<string, unknown>).error as string).trim() || fallbackMessage;
  }

  return fallbackMessage;
}

export async function invokeJsonEdgeFunction<T>(
  functionName: string,
  directUrl: string,
  payload: Record<string, unknown>,
  getAuthHeaders: AuthHeadersGetter,
  fallbackMessage: string,
) {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
    });

    if (error) {
      throw error;
    }

    if (data !== null && data !== undefined) {
      return data as T;
    }
  } catch (invokeError) {
    console.warn(`${functionName} invoke failed, retrying via direct fetch`, invokeError);
  }

  const headers = await getAuthHeaders();
  const response = await fetch(directUrl, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(extractErrorMessage(data, fallbackMessage));
  }

  return data as T;
}
