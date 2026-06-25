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

// Live progress while the server works through its render queue (one at a time).
export type AnalyzeProgress = { state: "queued" | "rendering"; position: number };

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function errorDetail(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: unknown };
    if (body?.detail) return typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
  } catch {
    // non-JSON error body — fall through to the generic message
  }
  return `Server error (${res.status}).`;
}

/**
 * Queue a journal for a PDF report and wait for it. The server renders one report
 * at a time, so this POSTs to /api/analyze (which returns a job id + place in
 * line) then polls /api/jobs/{id} until it's done. `onProgress` fires with the
 * live queue position so the caller can show "in line — N ahead" / "rendering".
 */
export async function analyze(
  input: AnalyzeInput,
  onProgress?: (p: AnalyzeProgress) => void,
  timeoutMs = 180000,
): Promise<AnalyzeResponse> {
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

  // 1) Enqueue: the server reads/parses the file now and returns a job id + position.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000); // covers upload + parse only
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
  if (!res.ok) throw new ApiError(await errorDetail(res));
  const queued = (await res.json()) as { job_id: string; state: AnalyzeProgress["state"]; position: number };
  onProgress?.({ state: queued.state, position: queued.position });

  // 2) Poll for the place in line, then the finished report. The render is
  // server-side, so a single failed poll (dropped packet / cold-server blip) must
  // NOT abandon a report that's still being made. Tolerate a short streak of bad
  // polls; a good one resets it. This adds zero time to a healthy report — it only
  // keeps polling instead of quitting when the network hiccups.
  const deadline = Date.now() + timeoutMs;
  let misses = 0;
  const MAX_MISSES = 5; // ~5 bad polls in a row before we conclude the network is really down
  while (Date.now() < deadline) {
    await sleep(1500);
    try {
      // Per-poll timeout so one hung connection can't block past the deadline.
      const ctrl = new AbortController();
      const pollTimer = setTimeout(() => ctrl.abort(), 10000);
      let job: { state: string; position: number; result?: AnalyzeResponse; error?: string };
      try {
        const s = await fetch(`${base}/api/jobs/${queued.job_id}`, { signal: ctrl.signal });
        if (!s.ok) throw new Error(`status ${s.status}`); // transient → tolerated below
        job = await s.json();
      } finally {
        clearTimeout(pollTimer);
      }
      misses = 0; // a good poll clears the streak
      if (job.state === "done" && job.result) return job.result;
      if (job.state === "error") throw new ApiError(job.error ?? "Report generation failed.");
      onProgress?.({ state: job.state as AnalyzeProgress["state"], position: job.position });
    } catch (e) {
      if (e instanceof ApiError) throw e; // a real server-side render error — stop and show it
      if (++misses >= MAX_MISSES) throw new ApiError("Lost connection while waiting for the report.");
      // otherwise a transient blip — keep polling, the server is still rendering
    }
  }
  throw new ApiError("Timed out waiting for the report. The server may be overloaded.");
}
