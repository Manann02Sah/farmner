export function getGeminiApiKeys() {
  const keys = [
    Deno.env.get("GEMINI_API_KEY_1"),
    Deno.env.get("GEMINI_API_KEY_2"),
    Deno.env.get("GEMINI_API_KEY_3"),
    Deno.env.get("GEMINI_API_KEY_4"),
    Deno.env.get("GEMINI_API_KEY"),
  ]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean);

  return [...new Set(keys)];
}

export function getGeminiKeyError() {
  return "No Gemini keys are configured. Set GEMINI_API_KEY_1, GEMINI_API_KEY_2, GEMINI_API_KEY_3, and GEMINI_API_KEY_4 in Supabase secrets.";
}

export function shouldRetryGeminiStatus(status: number) {
  return status === 401 || status === 403 || status === 404 || status === 429 || status >= 500;
}

export async function fetchWithGeminiKeyRotation(
  buildRequest: (apiKey: string) => Promise<Response>,
) {
  const keys = getGeminiApiKeys();
  if (keys.length === 0) {
    throw new Error(getGeminiKeyError());
  }

  let lastResponse: Response | null = null;

  for (const key of keys) {
    const response = await buildRequest(key);
    if (response.ok) {
      return response;
    }

    lastResponse = response;
    if (!shouldRetryGeminiStatus(response.status)) {
      break;
    }
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw new Error("Gemini request could not be started.");
}
