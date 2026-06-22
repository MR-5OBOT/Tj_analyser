import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const API_URL_KEY = "tj.apiBaseUrl";

const CONFIG_DEFAULT = String(
  (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ?? "",
).replace(/\/+$/, "");

/** Effective backend URL: a Settings override if set, else the build-time default. */
export async function getBaseUrl(): Promise<string> {
  let override: string | null = null;
  try {
    override = await AsyncStorage.getItem(API_URL_KEY);
  } catch {
    override = null;
  }
  return (override?.trim() || CONFIG_DEFAULT).replace(/\/+$/, "");
}

export async function setBaseUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(API_URL_KEY, url.trim());
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
