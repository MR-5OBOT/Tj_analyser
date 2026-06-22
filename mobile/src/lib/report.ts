import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

const EXPORT_DIR_KEY = "tj.exportDir";

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
  const savedTo = await saveToExportFolder(cacheUri, baseName);
  return { cacheUri, savedTo };
}

async function saveToExportFolder(cacheUri: string, baseName: string): Promise<string | null> {
  let dir = (await AsyncStorage.getItem(EXPORT_DIR_KEY))?.trim() || null;
  if (!dir) {
    const res = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!res.granted) return null; // declined — caller can offer Share instead
    dir = res.directoryUri;
    await AsyncStorage.setItem(EXPORT_DIR_KEY, dir);
  }
  try {
    const base64 = await FileSystem.readAsStringAsync(cacheUri, { encoding: FileSystem.EncodingType.Base64 });
    const destUri = await FileSystem.StorageAccessFramework.createFileAsync(dir, baseName, "application/pdf");
    await FileSystem.writeAsStringAsync(destUri, base64, { encoding: FileSystem.EncodingType.Base64 });
    return destUri;
  } catch {
    // The remembered folder may have been revoked (e.g. after reinstall) — forget it
    // so the next export re-prompts.
    await AsyncStorage.removeItem(EXPORT_DIR_KEY);
    return null;
  }
}
