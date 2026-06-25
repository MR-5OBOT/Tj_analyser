// One home for every file the app writes out — PDF reports, CSV journal exports,
// and shared trade images all land in a single "TJ ANALYZER" folder. Android's
// Storage Access Framework grants a location ONCE (we point the picker at
// Downloads), we create/own a TJ ANALYZER subfolder inside it, remember it, and
// write everything there with no further prompts.
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

const EXPORTS_DIR_KEY = "tj.exportsDir"; // content:// URI of the TJ ANALYZER subfolder
const DOWNLOADS_DIR_URI = "content://com.android.externalstorage.documents/tree/primary%3ADownload";
const FOLDER_NAME = "TJ ANALYZER";
const SAF = FileSystem.StorageAccessFramework;

/** Friendly label for "saved to …" messages. */
export const EXPORTS_LABEL = `Downloads/${FOLDER_NAME}`;

// Get the TJ ANALYZER folder URI, asking for a location + creating the subfolder
// the first time. Returns null if the user declines the picker.
async function ensureDir(): Promise<string | null> {
  const saved = (await AsyncStorage.getItem(EXPORTS_DIR_KEY))?.trim();
  if (saved) return saved;

  const res = await SAF.requestDirectoryPermissionsAsync(DOWNLOADS_DIR_URI);
  if (!res.granted) return null;
  const parent = res.directoryUri;

  // Reuse an existing TJ ANALYZER folder if there is one (avoid "TJ ANALYZER (1)").
  let dir: string | null = null;
  try {
    const children = await SAF.readDirectoryAsync(parent);
    dir = children.find((u) => decodeURIComponent(u).toUpperCase().endsWith("/" + FOLDER_NAME)) ?? null;
  } catch {
    // can't list — fall through and create
  }
  if (!dir) dir = await SAF.makeDirectoryAsync(parent, FOLDER_NAME);

  await AsyncStorage.setItem(EXPORTS_DIR_KEY, dir);
  return dir;
}

export type ExportContent =
  | { kind: "string"; data: string } // CSV / text → utf8
  | { kind: "base64"; data: string } // already-base64 bytes (PNG)
  | { kind: "fileUri"; uri: string }; // copy an existing cache file (downloaded PDF)

/**
 * Write a file into the TJ ANALYZER folder. `baseName` is the name WITHOUT
 * extension — Android adds it from `mime`. Returns the saved label, or null if the
 * folder grant was declined / lost (caller can then fall back to a share sheet).
 */
export async function saveToExports(baseName: string, mime: string, content: ExportContent): Promise<string | null> {
  const dir = await ensureDir();
  if (!dir) return null;
  try {
    const destUri = await SAF.createFileAsync(dir, baseName, mime);
    if (content.kind === "string") {
      await FileSystem.writeAsStringAsync(destUri, content.data); // utf8
    } else {
      const base64 =
        content.kind === "base64"
          ? content.data
          : await FileSystem.readAsStringAsync(content.uri, { encoding: FileSystem.EncodingType.Base64 });
      await FileSystem.writeAsStringAsync(destUri, base64, { encoding: FileSystem.EncodingType.Base64 });
    }
    return EXPORTS_LABEL;
  } catch {
    // The grant was probably revoked (e.g. after reinstall) — forget it so the next
    // export re-prompts instead of failing forever.
    await AsyncStorage.removeItem(EXPORTS_DIR_KEY);
    return null;
  }
}

/** A timestamped, extension-less base name, e.g. `tj-journals-202606271530`. */
export function exportStamp(prefix: string): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${prefix}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}
