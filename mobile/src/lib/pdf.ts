import * as FileSystem from "expo-file-system";
import * as Linking from "expo-linking";
import * as Sharing from "expo-sharing";

import { downloadUrl } from "./api";

function safeFilename(reportId: string): string {
  return `tj-report-${reportId.slice(0, 8)}.pdf`;
}

/**
 * Download the report PDF to the app cache and open the native share sheet
 * (which includes "Save to device", "Open with", etc.). Falls back to opening
 * the URL directly if file download or sharing is unavailable.
 */
export async function sharePdf(reportPath: string, reportId: string): Promise<void> {
  const url = downloadUrl(reportPath);

  try {
    const cacheDir = (FileSystem as { cacheDirectory?: string }).cacheDirectory;
    const canDownload = typeof (FileSystem as { downloadAsync?: unknown }).downloadAsync === "function";

    if (cacheDir && canDownload && (await Sharing.isAvailableAsync())) {
      const target = cacheDir + safeFilename(reportId);
      const result = await (FileSystem as unknown as {
        downloadAsync: (u: string, f: string) => Promise<{ uri: string }>;
      }).downloadAsync(url, target);
      await Sharing.shareAsync(result.uri, { mimeType: "application/pdf", dialogTitle: "TJ Analyser report" });
      return;
    }
  } catch {
    // fall through to opening the URL directly
  }

  await Linking.openURL(url);
}

/** Open the PDF in the device's browser / PDF viewer without downloading. */
export async function openPdf(reportPath: string): Promise<void> {
  await Linking.openURL(downloadUrl(reportPath));
}
