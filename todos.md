# TJ Analyser — TODOs

## Journals persistence: SAF folder + auto-mirrored CSV

**Goal:** Logged trades survive app uninstall / clear-data, and live as a plain,
portable CSV the user owns and can grab anytime — no server, no accounts, no secrets.

### Why this approach
- **Local-first & durable:** the CSV lives in a user-picked folder (their storage),
  not the app sandbox, so wiping app data or uninstalling does **not** delete it.
- **Portable:** plain CSV opens in Sheets/Excel; no weird file type.
- **Play-Store-safe:** uses the Storage Access Framework (folder picker), not the
  restricted broad `WRITE_EXTERNAL_STORAGE` permission.
- **Feeds the PDF report:** CSV columns match the backend's accepted column names,
  so the same file is the report's input (log → CSV → PDF, no export step).

### How it works
1. **First run (or in Settings):** user taps "Choose journals folder" →
   `StorageAccessFramework.requestDirectoryPermissionsAsync()` → picks/creates a
   folder → Android grants a *persisted* permission to **that folder only**.
   Store the returned `directoryUri` (+ the created file's URI) in AsyncStorage.
2. **Working copy:** AsyncStorage (`tj.journals`) stays the fast in-app store for
   instant reads/writes and offline use.
3. **Mirror on every change:** on each add/edit/delete, rewrite the **whole**
   `journals.csv` into the chosen folder (simpler than appending via SAF; trivial
   cost even for thousands of rows).
4. **Restore on reinstall:** uninstall/clear-data drops AsyncStorage **and** the
   folder grant, but the CSV file remains. App asks the user to **re-pick the
   folder**, then reads `journals.csv` back in → data restored.

### Architecture
- `AsyncStorage` = source of truth while the app runs (fast, offline).
- `journals.csv` in the SAF folder = durable, portable mirror + restore source.
- Keep both in sync: write-through to CSV after every mutation.

### CSV schema (align to backend `config.py` accepted names)
Header row (first accepted name per field; `id` is local-only, ignored by the report):
```
id,date,day,asset,entry_time,exit_time,size,outcome,rr,risk,reward,sl,session,setup,notes
```

### Storage module sketch (`mobile/src/lib/journalStore.ts`)
- `pickFolder(): Promise<boolean>` — SAF request; persist `directoryUri` + create
  `journals.csv`, store its URI.
- `addTrade(trade)` / `updateTrade(id, patch)` / `deleteTrade(id)` — mutate
  AsyncStorage list, then `mirrorCsv()`.
- `mirrorCsv()` — serialize the list to CSV, `writeAsStringAsync(fileUri, csv)`.
- `loadFromCsv()` — `readAsStringAsync(fileUri)` → parse → seed AsyncStorage
  (used on reinstall / when local store is empty but a folder is linked).
- `getFolderStatus()` — for a Settings row showing the linked folder / "not set".

### Settings UI additions
- "Journals folder" row → pick / change folder, show linked path or "Not linked".
- "Restore from CSV" action (re-read the folder's `journals.csv`).
- Existing "Export journals (CSV)" can stay as a manual one-off share.

### Edge cases / notes
- SAF uses `content://` URIs; track the `journals.csv` file URI explicitly
  (don't assume a path). Re-create the file if missing.
- Persisted permission survives app restarts, **not** uninstall → re-pick needed.
- Rewrite-whole-file keeps logic simple and avoids SAF append quirks.
- If folder not linked yet, keep working from AsyncStorage and prompt to link.

### Prerequisites (do first)
- Define the **trade schema** (fields above) and build the **Add-trade** screen +
  **Journals** list (currently empty pages). Sync/mirror rides on top of those.

### Optional later
- Additive cloud option (Apps Script → Google Sheet) if off-device backup is ever
  wanted. The local CSV mirror stands alone; cloud is purely additive.
