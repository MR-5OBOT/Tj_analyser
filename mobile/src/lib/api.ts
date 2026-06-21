import { API_BASE_URL } from "./config";
import { AnalysisResponse, InspectResponse } from "../types";

export class ApiError extends Error {
  status?: number;
  debugMessage?: string;

  constructor(message: string, options?: { status?: number; debugMessage?: string }) {
    super(message);
    this.name = "ApiError";
    this.status = options?.status;
    this.debugMessage = options?.debugMessage;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function parseJson<T>(response: Response, fallbackDetail: string): Promise<T> {
  const text = await response.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new ApiError("Backend returned an invalid response.", {
        status: response.status,
        debugMessage: text.slice(0, 500),
      });
    }
  }

  if (!response.ok) {
    const detail =
      payload && typeof payload === "object" && "detail" in payload && typeof (payload as { detail: unknown }).detail === "string"
        ? (payload as { detail: string }).detail
        : fallbackDetail;
    throw new ApiError(detail, { status: response.status, debugMessage: text.slice(0, 500) });
  }

  return payload as T;
}

/** Quick liveness check used for cold-start warmup. Returns false instead of throwing. */
export async function health(timeoutMs = 6000): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/health`, { method: "GET" }, timeoutMs);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Poll the backend until it responds, to cover free-host cold starts (the instance sleeps
 * when idle and takes a few seconds to wake). Reports progress via onWaking.
 */
export async function wakeBackend(onWaking?: () => void, attempts = 8): Promise<void> {
  if (await health(5000)) return;
  onWaking?.();
  for (let i = 0; i < attempts; i += 1) {
    if (await health(8000)) return;
  }
  throw new ApiError("Could not reach the server. Check your connection and try again.");
}

export async function inspectColumns(form: FormData): Promise<InspectResponse> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/inspect`, { method: "POST", body: form }, 60000);
  return parseJson<InspectResponse>(response, "Could not read the file columns.");
}

export async function analyzeJournal(form: FormData): Promise<AnalysisResponse> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/analyze`, { method: "POST", body: form }, 90000);
  return parseJson<AnalysisResponse>(response, "Analysis failed.");
}

export function downloadUrl(path: string): string {
  return path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
}
