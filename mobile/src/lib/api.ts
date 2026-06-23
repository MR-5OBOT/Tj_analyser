// Backend home, hardcoded in JS only — NOT read from expoConfig.extra, because
// that value is baked into the build and OTA can't change it (an old build could
// pin a stale URL and 404). This constant is the single source, so OTA controls it.
const BASE_URL = "https://inquisitive-lottie-fsocietyt-f7a26bff.koyeb.app".replace(/\/+$/, "");

/** The backend URL (fixed). Async so existing callers don't change. */
export async function getBaseUrl(): Promise<string> {
  return BASE_URL;
}

/** Reachability check for the Settings health line: any HTTP reply = up. */
export async function pingBackend(timeoutMs = 12000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(BASE_URL, { method: "GET", signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export type AnalyzeResponse = {
  report_id: string;
  stats: Record<string, unknown>;
  detected_mappings: Record<string, string>;
  source_columns: string[];
  unmapped_columns: string[];
  rows_processed: number;
  download_url: string;
};

export class ApiError extends Error {}

export type AnalyzeInput =
  | { kind: "file"; uri: string; name: string; mimeType?: string }
  | { kind: "url"; url: string };

/** POST a journal (file or URL) to /api/analyze and return the report metadata. */
export async function analyze(input: AnalyzeInput, timeoutMs = 90000): Promise<AnalyzeResponse> {
  const base = await getBaseUrl();
  if (!base) throw new ApiError("No backend URL set. Add it in Settings → Server.");

  const form = new FormData();
  form.append("sheet_name", "0");
  if (input.kind === "url") {
    form.append("file_url", input.url.trim());
  } else {
    // React Native multipart file part: { uri, name, type }.
    form.append("upload", {
      uri: input.uri,
      name: input.name,
      type: input.mimeType || "application/octet-stream",
    } as unknown as Blob);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${base}/api/analyze`, { method: "POST", body: form, signal: controller.signal });
  } catch (e) {
    if ((e as { name?: string })?.name === "AbortError") {
      throw new ApiError("Timed out — the free server may be waking up. Try again in a moment.");
    }
    throw new ApiError("Network error. Check your connection and the backend URL in Settings.");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let detail = `Server error (${res.status}).`;
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (body?.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      // non-JSON error body — keep the generic message
    }
    throw new ApiError(detail);
  }
  return (await res.json()) as AnalyzeResponse;
}
