import { AnalysisResponse } from "./types";

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

export async function analyzeJournal(
  backendUrl: string,
  formData: FormData,
): Promise<AnalysisResponse> {
  const endpoint = `${backendUrl.replace(/\/$/, "")}/api/analyze`;
  console.info("[api] analyze_request_started", { endpoint });

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    console.error("[api] analyze_request_network_error", { endpoint, error });
    throw new ApiError("Network request failed. Check backend availability and HTTPS app configuration.", {
      debugMessage: error instanceof Error ? error.message : String(error),
    });
  }

  const responseText = await response.text();
  let payload: unknown = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch (error) {
      console.error("[api] analyze_response_json_error", {
        endpoint,
        status: response.status,
        responseText: responseText.slice(0, 500),
        error,
      });
      throw new ApiError("Backend returned an invalid response.", {
        status: response.status,
        debugMessage: responseText.slice(0, 500),
      });
    }
  }

  if (!response.ok) {
    const detail =
      payload && typeof payload === "object" && "detail" in payload && typeof payload.detail === "string"
        ? payload.detail
        : "Analysis failed.";
    console.error("[api] analyze_request_failed", {
      endpoint,
      status: response.status,
      detail,
      payload,
    });
    throw new ApiError(detail, {
      status: response.status,
      debugMessage: typeof payload === "object" ? JSON.stringify(payload) : responseText.slice(0, 500),
    });
  }

  console.info("[api] analyze_request_finished", { endpoint, status: response.status });
  return payload as AnalysisResponse;
}
