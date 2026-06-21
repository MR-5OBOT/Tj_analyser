import { API_BASE_URL } from "./config";

export type SchemaColumn = {
  field: string;
  label: string;
  description: string;
  accepted_names: string[];
};

export type SchemaResponse = {
  columns: SchemaColumn[];
  required_one_of: string[];
  note: string;
};

/** Fetch the accepted-columns schema from the backend, with a hard timeout. */
export async function fetchSchema(timeoutMs = 20000): Promise<SchemaResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE_URL}/api/schema`, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}.`);
    }
    const data = (await res.json()) as Partial<SchemaResponse>;
    if (!data || !Array.isArray(data.columns)) {
      throw new Error("Unexpected response — the backend may need a redeploy.");
    }
    return {
      columns: data.columns,
      required_one_of: data.required_one_of ?? [],
      note: data.note ?? "",
    };
  } finally {
    clearTimeout(timer);
  }
}
