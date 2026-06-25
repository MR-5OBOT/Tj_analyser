import * as FileSystem from "expo-file-system/legacy";

import { saveToExports } from "./exports";

// cacheUri = the downloaded PDF in cache (for a share/open fallback); savedTo = the
// "Downloads/TJ ANALYZER" label when it was mirrored to the export folder, else null.
export type SaveResult = { cacheUri: string; savedTo: string | null };

/** A timestamped base name (no extension) for a generated report. */
export function reportBaseName(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `tj-report-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/**
 * Download the generated PDF to cache, then mirror it into the user's chosen
 * export folder (e.g. Downloads). The folder is picked once via SAF and
 * remembered, so later reports save automatically. Returns the cache URI (for
 * opening/sharing) and the saved destination (null if the user declined a folder).
 */
export async function downloadReport(pdfUrl: string, baseName: string): Promise<SaveResult> {
  const cacheUri = `${FileSystem.cacheDirectory}${baseName}.pdf`;
  const dl = await FileSystem.downloadAsync(pdfUrl, cacheUri);
  if (dl.status !== 200) {
    throw new Error(`Couldn't fetch the generated report (status ${dl.status}).`);
  }
  // Mirror into the shared TJ ANALYZER folder (asks for the folder once).
  const savedTo = await saveToExports(baseName, "application/pdf", { kind: "fileUri", uri: cacheUri });
  return { cacheUri, savedTo };
}
