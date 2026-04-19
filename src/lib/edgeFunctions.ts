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
  const normalizedDirectUrl = typeof directUrl === "string" ? directUrl.trim() : "";
  if (!normalizedDirectUrl.startsWith("http")) {
    throw new Error(
      `${fallbackMessage} Edge function URL is missing. Check VITE_SUPABASE_URL in the frontend environment.`,
    );
  }

  let invokeFailureMessage = "";

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
    invokeFailureMessage =
      invokeError instanceof Error && invokeError.message.trim()
        ? invokeError.message.trim()
        : "";
    console.warn(`${functionName} invoke failed, retrying via direct fetch`, invokeError);
  }

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(normalizedDirectUrl, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = extractErrorMessage(data, fallbackMessage);
      if (invokeFailureMessage) {
        throw new Error(`${errorMessage} (invoke: ${invokeFailureMessage})`);
      }
      throw new Error(errorMessage);
    }

    return data as T;
  } catch (fetchError) {
    if (fetchError instanceof Error && fetchError.message.trim()) {
      throw fetchError;
    }

    const combinedHint = invokeFailureMessage
      ? `${fallbackMessage} Could not reach the edge function endpoint. (invoke: ${invokeFailureMessage})`
      : `${fallbackMessage} Could not reach the edge function endpoint. Please verify function deployment and network access.`;
    throw new Error(combinedHint);
  }
}

export async function invokeFormDataEdgeFunction<T>(
  functionName: string,
  directUrl: string,
  payload: FormData,
  getAuthHeaders: AuthHeadersGetter,
  fallbackMessage: string,
) {
  const normalizedDirectUrl = typeof directUrl === "string" ? directUrl.trim() : "";
  if (!normalizedDirectUrl.startsWith("http")) {
    throw new Error(
      `${fallbackMessage} Edge function URL is missing. Check VITE_SUPABASE_URL in the frontend environment.`,
    );
  }

  let invokeFailureMessage = "";

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
    invokeFailureMessage =
      invokeError instanceof Error && invokeError.message.trim()
        ? invokeError.message.trim()
        : "";
    console.warn(`${functionName} invoke failed, retrying via direct fetch`, invokeError);
  }

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(normalizedDirectUrl, {
      method: "POST",
      headers,
      body: payload,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = extractErrorMessage(data, fallbackMessage);
      if (invokeFailureMessage) {
        throw new Error(`${errorMessage} (invoke: ${invokeFailureMessage})`);
      }
      throw new Error(errorMessage);
    }

    return data as T;
  } catch (fetchError) {
    if (fetchError instanceof Error && fetchError.message.trim()) {
      throw fetchError;
    }

    const combinedHint = invokeFailureMessage
      ? `${fallbackMessage} Could not reach the edge function endpoint. (invoke: ${invokeFailureMessage})`
      : `${fallbackMessage} Could not reach the edge function endpoint. Please verify function deployment and network access.`;
    throw new Error(combinedHint);
  }
}
