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

## On-device PDF report — retire the Python backend

**Goal:** Generate the PDF report on the phone, so the app needs no server at all
— then delete `backend/`, `helpers/`, `Dockerfile.backend`, and the Koyeb deploy.

### Why (and why NOT bundle Python)
- The server's only job is the PDF. All stats/charts are already computed in-app
  (`dashboard.ts` + SVG in `Charts.tsx`); the app is fully offline except this.
- The pain is the free server: cold starts, a separate deploy, an upload flow.
- **Do NOT bundle the Python into the app.** pandas/numpy/matplotlib via Chaquopy
  needs ejecting Expo managed → bare, ARM C-extension wheels, +tens of MB APK, and
  ongoing native upkeep. That's a *bigger* headache, not smaller. Rejected.

### Approach: `expo-print` (HTML → PDF) + `expo-sharing`
- Build the report as an HTML string from the in-app stats; embed charts as inline
  SVG (reuse the `Charts.tsx` shapes). `Print.printToFileAsync({ html })` → PDF →
  share/save with the existing `expo-sharing` flow.
- Vector-crisp, matches the app's neo-brutalist style (report finally looks like
  the app, not matplotlib).

### Chart parity (matches or beats current report)
Most are already SVG in-app → equal/better, near-automatic:
- stats table (HTML table, better), R curve + drawdown (`lineplot`→ EquityChart),
  asset/months/outcome bars (`barplot`→ BarChart), risk-vs-R / SL / bubble
  scatters (`scatterplot`→ Scatter/RiskScatter).

Two charts are the deliberate work — do them properly so nothing regresses:
- **Distribution** (`sns.histplot`): bin the values in JS (~20 lines), draw bars.
- **Heatmap** R by day×hour (`sns.heatmap`, RdBu_r): a colored grid like the P&L
  calendar + a diverging value→color function.

### Cost / sequencing
- One dependency (`expo-print`) + one native rebuild; after that it's OTA-able.
- Then strip the backend entirely.
- **Do this AFTER the big-data lag work is closed** (current focus).

## Share trade — social-media recap card

**Goal:** Turn the row long-press "Share" (currently a no-op stub in
`TradesLogs.tsx`, `shareRow`) into a polished, shareable **trade execution recap**
— a good-looking image card for a social post, NOT a raw data/CSV share.

### What it is
- A designed card for one trade: symbol, direction, R result, date/entry time,
  maybe a mini equity/R sparkline — in the app's neo-brutalist style.
- Rendered to an image and handed to `expo-sharing` so the user posts it to
  X/IG/Discord etc.

### Likely approach (decide when building)
- Render the card off-screen as RN/SVG, capture with `react-native-view-shot`
  (→ PNG), then `Sharing.shareAsync`. Or reuse the future `expo-print` HTML path
  to make an image. Pick whichever's already in the app by then.
- Keep it template-driven so the look is one place to tweak.

### Notes
- Until built, **hide the Share menu item** so it isn't a dead button.
- Pairs well with the `expo-print` work (shared rendering/sharing plumbing).
- **Later — not now.**
